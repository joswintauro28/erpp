import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiTenantRequest } from '../middleware/tenant.middleware';
import { 
  workflowLogs,
  workflowTelemetry,
  updateWorkflowTelemetry,
  triggerEventBusSimulation,
  addWorkflowLog
} from '../services/workflow.service';

const prisma = new PrismaClient();

// GET /api/workflows
export const getWorkflowsData = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const organizationId = tenant.id;

    // Refresh telemetry counters
    await updateWorkflowTelemetry(organizationId);

    const workflows = await prisma.workflow.findMany({
      where: { organizationId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 30
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Extract all logs in a flat list for UI ledger auditing
    const logs = await prisma.workflowLog.findMany({
      where: {
        workflow: { organizationId }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        workflow: {
          select: { name: true }
        }
      }
    });

    res.json({
      workflows,
      logs,
      telemetry: workflowTelemetry,
      logsStream: workflowLogs
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Internal server error fetching workflows engine data' });
  }
};

// POST /api/workflows
export const createWorkflow = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const organizationId = tenant.id;
    const { id, name, description, triggerType, triggerConditions, actionType, actionConfig, isActive } = req.body;

    if (!name || !triggerType || !actionType) {
      res.status(400).json({ error: 'Missing parameters name, triggerType, or actionType.' });
      return;
    }

    // Standardize configurations as stringified JSON
    const strConditions = typeof triggerConditions === 'string' 
      ? triggerConditions 
      : JSON.stringify(triggerConditions || {});

    const strConfig = typeof actionConfig === 'string' 
      ? actionConfig 
      : JSON.stringify(actionConfig || {});

    let workflow;

    if (id) {
      // Update
      workflow = await prisma.workflow.update({
        where: { id },
        data: {
          name,
          description,
          triggerType,
          triggerConditions: strConditions,
          actionType,
          actionConfig: strConfig,
          isActive: isActive !== undefined ? isActive : true
        }
      });
      addWorkflowLog(`[Rule Engine] Workflow rule updated: key="${name}" (ID: ${workflow.id})`);
    } else {
      // Create
      workflow = await prisma.workflow.create({
        data: {
          organizationId,
          name,
          description,
          triggerType,
          triggerConditions: strConditions,
          actionType,
          actionConfig: strConfig,
          isActive: isActive !== undefined ? isActive : true
        }
      });
      addWorkflowLog(`[Rule Engine] New workflow rule registered: key="${name}" (ID: ${workflow.id})`);
    }

    // Refresh telemetry counters
    await updateWorkflowTelemetry(organizationId);

    res.status(201).json({
      message: 'Workflow successfully saved.',
      workflow
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Internal server error committing workflow rule config' });
  }
};

// POST /api/workflows/toggle
export const toggleWorkflow = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const { id, isActive } = req.body;

    if (!id || isActive === undefined) {
      res.status(400).json({ error: 'Missing parameter id or isActive status.' });
      return;
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id, organizationId: tenant.id }
    });

    if (!workflow) {
      res.status(404).json({ error: 'Workflow rule not found in workspace.' });
      return;
    }

    await prisma.workflow.update({
      where: { id },
      data: { isActive }
    });

    addWorkflowLog(`[Rule Engine] Rule status toggled: "${workflow.name}" is now ${isActive ? 'ACTIVE' : 'INACTIVE'}`);

    // Refresh telemetry counters
    await updateWorkflowTelemetry(tenant.id);

    res.json({ message: 'Workflow rule status updated.' });
  } catch (error) {
    console.error('Toggle workflow error:', error);
    res.status(500).json({ error: 'Internal server error toggling automation status' });
  }
};

// DELETE /api/workflows/:id
export const deleteWorkflow = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const { id } = req.params;

    const workflow = await prisma.workflow.findFirst({
      where: { id, organizationId: tenant.id }
    });

    if (!workflow) {
      res.status(404).json({ error: 'Workflow rule not found in workspace.' });
      return;
    }

    await prisma.workflow.delete({
      where: { id }
    });

    addWorkflowLog(`[Rule Engine] Purged workflow rule: "${workflow.name}" (ID: ${id})`);

    // Refresh telemetry counters
    await updateWorkflowTelemetry(tenant.id);

    res.json({ message: 'Workflow rule deleted.' });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ error: 'Internal server error deleting automation rule' });
  }
};

// POST /api/workflows/simulate
export const simulateWorkflowEvent = async (req: MultiTenantRequest, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      res.status(403).json({ error: 'Active organization context required' });
      return;
    }

    const { triggerType } = req.body;
    const validTriggers = ['INVOICE_UNPAID', 'PAYMENT_RECEIVED', 'GST_DUE'];

    if (!validTriggers.includes(triggerType)) {
      res.status(400).json({ error: 'Invalid trigger event selector.' });
      return;
    }

    const mockPayload = await triggerEventBusSimulation({
      organizationId: tenant.id,
      triggerType: triggerType as any
    });

    res.json({
      message: `Simulated event bus signal [${triggerType}] dispatched.`,
      payload: mockPayload
    });
  } catch (error) {
    console.error('Simulate workflow event error:', error);
    res.status(500).json({ error: 'Internal server error injecting simulation event' });
  }
};
