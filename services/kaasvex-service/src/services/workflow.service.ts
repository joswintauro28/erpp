import { PrismaClient } from '@prisma/client';
import { queueNotification } from './notification.service';

const prisma = new PrismaClient();

export interface WorkflowTelemetry {
  activeRulesCount: number;
  totalRunsCount: number;
  successRunsCount: number;
  failedRunsCount: number;
}

export const workflowTelemetry: WorkflowTelemetry = {
  activeRulesCount: 0,
  totalRunsCount: 0,
  successRunsCount: 0,
  failedRunsCount: 0
};

// In-memory rolling logs (max 100)
export const workflowLogs: string[] = [];

export const addWorkflowLog = (msg: string) => {
  const timestamp = new Date().toISOString();
  workflowLogs.push(`[${timestamp}] ${msg}`);
  if (workflowLogs.length > 100) {
    workflowLogs.shift();
  }
};

// Initialize logs
addWorkflowLog('Workflow Automation Engine Initialized. Listening for Event Bus signals...');

// Helper to seed active telemetry counters
export const updateWorkflowTelemetry = async (organizationId: string) => {
  try {
    const activeRulesCount = await prisma.workflow.count({
      where: { organizationId, isActive: true }
    });
    const totalRunsCount = await prisma.workflowLog.count({
      where: { workflow: { organizationId } }
    });
    const successRunsCount = await prisma.workflowLog.count({
      where: { workflow: { organizationId }, status: 'SUCCESS' }
    });
    const failedRunsCount = await prisma.workflowLog.count({
      where: { workflow: { organizationId }, status: 'FAILED' }
    });

    workflowTelemetry.activeRulesCount = activeRulesCount;
    workflowTelemetry.totalRunsCount = totalRunsCount;
    workflowTelemetry.successRunsCount = successRunsCount;
    workflowTelemetry.failedRunsCount = failedRunsCount;
  } catch (err) {
    console.error('Failed to update workflow telemetry:', err);
  }
};

// Main Rule Evaluation and Action Execution Engine
export const processWorkflowEvent = async (params: {
  organizationId: string;
  triggerType: string;
  triggerEventData: any;
}) => {
  const { organizationId, triggerType, triggerEventData } = params;
  addWorkflowLog(`[Event Bus] Received event signal type="${triggerType}" for Org ID=${organizationId}.`);

  try {
    // 1. Fetch active workflows for this trigger type
    const workflows = await prisma.workflow.findMany({
      where: {
        organizationId,
        triggerType,
        isActive: true
      }
    });

    if (workflows.length === 0) {
      addWorkflowLog(`[Rule Engine] No active workflows configured for trigger "${triggerType}". Standby.`);
      return;
    }

    addWorkflowLog(`[Rule Engine] Found ${workflows.length} active rule(s) matching trigger type.`);

    for (const flow of workflows) {
      let isConditionMet = false;
      let logTriggerDesc = '';

      try {
        const conditions = JSON.parse(flow.triggerConditions || '{}');
        const actionConfig = JSON.parse(flow.actionConfig || '{}');

        // 2. Evaluate conditions based on trigger type
        if (triggerType === 'INVOICE_UNPAID') {
          const unpaidDaysLimit = conditions.unpaidDays || 7;
          const invoiceAgeDays = triggerEventData.unpaidDays || 0;
          const invoiceNumber = triggerEventData.invoiceNumber || 'Unknown';
          
          logTriggerDesc = `Invoice ${invoiceNumber} unpaid for ${invoiceAgeDays} days (Threshold: ${unpaidDaysLimit} days).`;

          if (invoiceAgeDays >= unpaidDaysLimit) {
            isConditionMet = true;
            addWorkflowLog(`[Rule Evaluation] PASS: Rule "${flow.name}" (ID: ${flow.id}) matches threshold age ${invoiceAgeDays} >= ${unpaidDaysLimit} days.`);
          } else {
            addWorkflowLog(`[Rule Evaluation] SKIP: Rule "${flow.name}" (ID: ${flow.id}) condition not met: age ${invoiceAgeDays} < ${unpaidDaysLimit} days.`);
          }
        } 
        else if (triggerType === 'PAYMENT_RECEIVED') {
          const amount = triggerEventData.amount || 0;
          const ref = triggerEventData.reference || 'Unknown';
          logTriggerDesc = `Payment received: ₹${amount} (Ref: ${ref}).`;
          isConditionMet = true; // generic trigger
          addWorkflowLog(`[Rule Evaluation] PASS: Rule "${flow.name}" evaluates true for payment event.`);
        } 
        else if (triggerType === 'GST_DUE') {
          const deadline = triggerEventData.deadline || 'end of month';
          logTriggerDesc = `GST Filing deadline approaching: ${deadline}.`;
          isConditionMet = true; // generic trigger
          addWorkflowLog(`[Rule Evaluation] PASS: Rule "${flow.name}" evaluates true for GST deadline.`);
        } 
        else {
          addWorkflowLog(`[WARNING] Unsupported trigger type "${triggerType}".`);
        }

        // 3. Execute actions if condition is met
        if (isConditionMet) {
          addWorkflowLog(`[Action Executor] Executing action "${flow.actionType}" for rule "${flow.name}"...`);
          let executionDetails = '';

          if (flow.actionType === 'SEND_REMINDER') {
            const channel = actionConfig.channel || 'EMAIL';
            const recipient = actionConfig.recipient || 'client@kaasvex.io';
            const content = actionConfig.content || 'Your invoice payment is overdue. Please settle as soon as possible.';

            // Queue notification through our communication module queue
            await queueNotification({
              organizationId,
              event: 'OVERDUE_REMINDER',
              recipient,
              content
            });

            executionDetails = `Dispatched overdue reminder on channel: ${channel} to: ${recipient}`;
            addWorkflowLog(`[Action Success] ${executionDetails}`);
          } 
          else if (flow.actionType === 'UPDATE_LEDGER') {
            const debitAccountCode = actionConfig.debitAccount || '1010'; // Cash
            const creditAccountCode = actionConfig.creditAccount || '4000'; // Sales Revenue
            const amount = triggerEventData.amount || 1000;

            // Generate double entry GL transaction
            const journal = await prisma.$transaction(async (tx) => {
              const debitAcc = await tx.account.findFirst({
                where: { organizationId, code: debitAccountCode }
              });
              const creditAcc = await tx.account.findFirst({
                where: { organizationId, code: creditAccountCode }
              });

              if (!debitAcc || !creditAcc) {
                throw new Error(`Accounts missing from chart: Debit code ${debitAccountCode} or Credit code ${creditAccountCode}`);
              }

              // Update account balances
              await tx.account.update({
                where: { id: debitAcc.id },
                data: { balance: { increment: amount } }
              });

              await tx.account.update({
                where: { id: creditAcc.id },
                data: { balance: { increment: amount } }
              });

              // Create journal entry
              return await tx.journalEntry.create({
                data: {
                  organizationId,
                  description: `[Workflow Sync] Payment ledger adjustment for ref: ${triggerEventData.reference || 'N/A'}`,
                  reference: triggerEventData.reference || 'WORKFLOW',
                  lines: {
                    create: [
                      { accountId: debitAcc.id, type: 'DEBIT', amount },
                      { accountId: creditAcc.id, type: 'CREDIT', amount }
                    ]
                  }
                }
              });
            });

            executionDetails = `Posted double-entry general ledger journal (Dr ${debitAccountCode}/Cr ${creditAccountCode}) for amount ₹${amount}. Journal ID: ${journal.id}`;
            addWorkflowLog(`[Action Success] ${executionDetails}`);
          } 
          else if (flow.actionType === 'NOTIFY_ACCOUNTANT') {
            const recipient = actionConfig.recipient || 'accountant@kaasvex.io';
            const content = actionConfig.content || 'GST filing cycle needs review. Audit ledger files.';

            await queueNotification({
              organizationId,
              event: 'INVOICE_SENT', // Seeded category standard
              recipient,
              content
            });

            executionDetails = `Notified accountant at: ${recipient} with alert content: "${content}"`;
            addWorkflowLog(`[Action Success] ${executionDetails}`);
          } 
          else {
            throw new Error(`Action type "${flow.actionType}" not recognized.`);
          }

          // 4. Log successful workflow run
          await prisma.workflowLog.create({
            data: {
              workflowId: flow.id,
              status: 'SUCCESS',
              triggerEvent: logTriggerDesc,
              executionDetails
            }
          });
        }
      } catch (err: any) {
        console.error('Workflow rule execution block failed:', err);
        addWorkflowLog(`[Action Error] Failed running rule "${flow.name}": ${err.message || err}`);
        
        await prisma.workflowLog.create({
          data: {
            workflowId: flow.id,
            status: 'FAILED',
            triggerEvent: logTriggerDesc || `Event of type ${triggerType}`,
            executionDetails: 'Action executor execution halted.',
            errorMessage: err.message || 'Unknown execution error'
          }
        });
      }
    }

    // Refresh telemetry bounds
    await updateWorkflowTelemetry(organizationId);
  } catch (error) {
    console.error('Event processing bus critical error:', error);
    addWorkflowLog(`[CRITICAL ERROR] Rules engine process halt: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// Simulate Event Bus Signal Generator
export const triggerEventBusSimulation = async (params: {
  organizationId: string;
  triggerType: 'INVOICE_UNPAID' | 'PAYMENT_RECEIVED' | 'GST_DUE';
}) => {
  const { organizationId, triggerType } = params;

  let triggerEventData: any = {};

  if (triggerType === 'INVOICE_UNPAID') {
    triggerEventData = {
      invoiceNumber: `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      unpaidDays: Math.random() > 0.3 ? 7 : 4, // 70% chance to match the threshold 7
      amount: Math.round(Math.random() * 50000 + 5000)
    };
  } 
  else if (triggerType === 'PAYMENT_RECEIVED') {
    triggerEventData = {
      reference: `PAY-TX-${Math.floor(Math.random() * 90000 + 10000)}`,
      amount: Math.round(Math.random() * 25000 + 2500)
    };
  } 
  else if (triggerType === 'GST_DUE') {
    triggerEventData = {
      deadline: new Date(Date.now() + 5 * 86400000).toLocaleDateString(), // 5 days from now
      quarter: 'Q1-2026'
    };
  }

  // Trigger processing asynchronously (detaches like real message broker event receipt)
  setTimeout(() => {
    (async () => {
      await processWorkflowEvent({
        organizationId,
        triggerType,
        triggerEventData
      });
    })();
  }, 100);

  return triggerEventData;
};
