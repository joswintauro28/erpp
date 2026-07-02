import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type BrokerType = 'KAFKA' | 'RABBITMQ' | 'AWS_SQS';

export interface TelemetryMetrics {
  activeBroker: BrokerType;
  queuedCount: number;
  processingCount: number;
  sentCount: number;
  failedCount: number;
  avgLatencyMs: number;
  kafkaPartitions: { id: number; offset: number; lag: number }[];
  rabbitmqQueues: { queueName: string; exchange: string; routingKey: string; messages: number; acked: number }[];
  awsSqsQueues: { queueUrl: string; messagesVisible: number; messagesFlight: number; visibilityTimeout: number }[];
}

// In-Memory Telemetry Metrics
export const telemetryMetrics: TelemetryMetrics = {
  activeBroker: 'KAFKA',
  queuedCount: 0,
  processingCount: 0,
  sentCount: 0,
  failedCount: 0,
  avgLatencyMs: 0,
  kafkaPartitions: [
    { id: 0, offset: 120, lag: 0 },
    { id: 1, offset: 145, lag: 0 },
    { id: 2, offset: 98, lag: 0 }
  ],
  rabbitmqQueues: [
    { queueName: 'q_kaasvex_notifications', exchange: 'notifications.exchange', routingKey: 'notify.*.*', messages: 0, acked: 0 }
  ],
  awsSqsQueues: [
    { queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/KaasvexNotificationQueue', messagesVisible: 0, messagesFlight: 0, visibilityTimeout: 30 }
  ]
};

// In-Memory Live Logs Buffer (Circular buffer of 100 items max)
export const brokerLogs: string[] = [];

export const addBrokerLog = (msg: string) => {
  const timestamp = new Date().toISOString();
  brokerLogs.push(`[${timestamp}] ${msg}`);
  if (brokerLogs.length > 100) {
    brokerLogs.shift();
  }
};

// Initialize Broker Logs
addBrokerLog('Broker System initialized. Active Broker: KAFKA.');
addBrokerLog('Kafka consumer group "group-kaasvex-notifications" successfully subscribed to topic "notifications-topic".');

// Toggle Active Broker Type
export const setBrokerType = (broker: BrokerType) => {
  telemetryMetrics.activeBroker = broker;
  addBrokerLog(`=== System requested change of broker message queue to: ${broker} ===`);
  
  if (broker === 'KAFKA') {
    addBrokerLog('Disconnecting from RabbitMQ/AWS SQS sockets...');
    addBrokerLog('Initializing Kafka Cluster configuration. Broker URLs: localhost:9092, localhost:9093.');
    addBrokerLog('Kafka Topic "notifications-topic" mapped with 3 partitions. Replication Factor: 2.');
    addBrokerLog('Kafka Group coordinator assigned metadata for Consumer Group "group-kaasvex-notifications".');
  } else if (broker === 'RABBITMQ') {
    addBrokerLog('Disconnecting from Kafka/AWS SQS sockets...');
    addBrokerLog('Initializing RabbitMQ Connection to amqp://localhost:5672.');
    addBrokerLog('Declaring exchange: "notifications.exchange" (type: topic, durable: true).');
    addBrokerLog('Declaring queue: "q_kaasvex_notifications" (durable: true).');
    addBrokerLog('Binding queue "q_kaasvex_notifications" to exchange "notifications.exchange" with binding pattern "notify.#".');
  } else if (broker === 'AWS_SQS') {
    addBrokerLog('Disconnecting from Kafka/RabbitMQ sockets...');
    addBrokerLog('Initializing AWS SDK SQS Client. Default Region: us-east-1.');
    addBrokerLog('Resolved queue URL: https://sqs.us-east-1.amazonaws.com/123456789012/KaasvexNotificationQueue');
    addBrokerLog('FIFO configuration verified. ContentBasedDeduplication enabled.');
  }
};

// Seed default settings for a tenant if none exist
export const ensureDefaultSettings = async (organizationId: string) => {
  const count = await prisma.notificationSetting.count({
    where: { organizationId }
  });

  if (count === 0) {
    const defaultSettings = [
      { event: 'INVOICE_SENT', emailEnabled: true, smsEnabled: false, whatsappEnabled: false, pushEnabled: false, inAppEnabled: true },
      { event: 'PAYMENT_RECEIVED', emailEnabled: true, smsEnabled: false, whatsappEnabled: true, pushEnabled: true, inAppEnabled: true },
      { event: 'SUBSCRIPTION_RENEWAL', emailEnabled: true, smsEnabled: false, whatsappEnabled: false, pushEnabled: false, inAppEnabled: true },
      { event: 'OVERDUE_REMINDER', emailEnabled: true, smsEnabled: true, whatsappEnabled: true, pushEnabled: false, inAppEnabled: true }
    ];

    for (const setting of defaultSettings) {
      await prisma.notificationSetting.create({
        data: {
          organizationId,
          event: setting.event,
          emailEnabled: setting.emailEnabled,
          smsEnabled: setting.smsEnabled,
          whatsappEnabled: setting.whatsappEnabled,
          pushEnabled: setting.pushEnabled,
          inAppEnabled: setting.inAppEnabled
        }
      });
    }
    addBrokerLog(`Seeded default notification preference rules for organization ${organizationId}.`);
  }
};

// Queue a new notification task
export const queueNotification = async (params: {
  organizationId: string;
  event: string;
  recipient: string;
  content: string;
}) => {
  const { organizationId, event, recipient, content } = params;
  
  try {
    // 1. Ensure preferences are seeded
    await ensureDefaultSettings(organizationId);

    // 2. Fetch notification rules for the event
    const rule = await prisma.notificationSetting.findUnique({
      where: {
        organizationId_event: { organizationId, event }
      }
    });

    if (!rule) {
      addBrokerLog(`[WARNING] No preference rules found for event: ${event}. Skipping.`);
      return;
    }

    const channels: ('EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'IN_APP')[] = [];
    if (rule.emailEnabled) channels.push('EMAIL');
    if (rule.smsEnabled) channels.push('SMS');
    if (rule.whatsappEnabled) channels.push('WHATSAPP');
    if (rule.pushEnabled) channels.push('PUSH');
    if (rule.inAppEnabled) channels.push('IN_APP');

    if (channels.length === 0) {
      addBrokerLog(`[Broker] Notification event "${event}" triggered, but all communication channels are disabled for this rule.`);
      return;
    }

    // 3. Queue separate message logs for each active channel
    for (const channel of channels) {
      const brokerUsed = telemetryMetrics.activeBroker;
      
      const log = await prisma.notificationLog.create({
        data: {
          organizationId,
          recipient,
          channel,
          event,
          status: 'QUEUED',
          content,
          brokerUsed
        }
      });

      // Update in-memory metrics
      telemetryMetrics.queuedCount++;

      // Log ingress broker details
      if (brokerUsed === 'KAFKA') {
        // Hash recipient to pick partition
        let hash = 0;
        for (let i = 0; i < recipient.length; i++) {
          hash = recipient.charCodeAt(i) + ((hash << 5) - hash);
        }
        const partitionId = Math.abs(hash) % 3;
        const currentPart = telemetryMetrics.kafkaPartitions.find(p => p.id === partitionId);
        if (currentPart) {
          currentPart.offset++;
          currentPart.lag++;
        }
        addBrokerLog(`[Kafka Producer] Enqueued record in topic "notifications-topic" partition ${partitionId} offset ${currentPart?.offset || 0}. Key: "${recipient}"`);
      } else if (brokerUsed === 'RABBITMQ') {
        const rkey = `notify.${event.toLowerCase()}.${channel.toLowerCase()}`;
        const queueObj = telemetryMetrics.rabbitmqQueues[0];
        queueObj.messages++;
        addBrokerLog(`[RabbitMQ Exchange] Message dispatched to exchange "notifications.exchange" with routing key "${rkey}" -> Bound to queue "q_kaasvex_notifications"`);
      } else if (brokerUsed === 'AWS_SQS') {
        const sqs = telemetryMetrics.awsSqsQueues[0];
        sqs.messagesVisible++;
        addBrokerLog(`[AWS SQS client] SentMessageRequest dispatched. QueueUrl: ${sqs.queueUrl}. MsgGroupId: grp_${organizationId}. MsgDeduplicationId: dedup_${log.id}`);
      }

      // Asynchronously process the enqueued task
      triggerTaskWorker(log.id);
    }
  } catch (error) {
    console.error('Queue notification failure:', error);
    addBrokerLog(`[SYSTEM ERROR] Failed to stage notification task: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// Asynchronous worker executor mimicking external thread pools/consumers
const triggerTaskWorker = (logId: string) => {
  // Simulate processing delay (network roundtrips, parsing templates, API execution)
  const processingDelay = Math.floor(Math.random() * 800) + 200; // 200ms - 1000ms

  setTimeout(async () => {
    try {
      // Retrieve the queued log
      const log = await prisma.notificationLog.findUnique({
        where: { id: logId }
      });

      if (!log || log.status !== 'QUEUED') return;

      // Transition to processing
      await prisma.notificationLog.update({
        where: { id: logId },
        data: { status: 'PROCESSING' }
      });

      // Update counters
      telemetryMetrics.queuedCount = Math.max(0, telemetryMetrics.queuedCount - 1);
      telemetryMetrics.processingCount++;

      // Simulate a small chance of service failure (e.g. invalid phone number, SMTP timeout) - 5% fail rate
      const isFailed = Math.random() < 0.05;
      const finalDelay = processingDelay + Math.floor(Math.random() * 200);

      // Log processing trigger
      const broker = telemetryMetrics.activeBroker;
      if (broker === 'KAFKA') {
        addBrokerLog(`[Kafka Consumer] Worker thread received notification ID: ${logId}. Channel: ${log.channel}. Executing transmission handler...`);
      } else if (broker === 'RABBITMQ') {
        addBrokerLog(`[RabbitMQ Worker] q_kaasvex_notifications received message envelope ${logId}. Channel: ${log.channel}.`);
      } else if (broker === 'AWS_SQS') {
        addBrokerLog(`[AWS SQS Worker] Polling thread acquired message. ReceiptHandle: handle_${logId.substring(0, 8)}. Invoking handler...`);
      }

      // Final status update (simulated success/failure)
      if (isFailed) {
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: 'FAILED',
            errorMessage: 'Gateway Timeout: External communications carrier rejected payload.',
            latencyMs: finalDelay
          }
        });

        telemetryMetrics.processingCount = Math.max(0, telemetryMetrics.processingCount - 1);
        telemetryMetrics.failedCount++;
        
        addBrokerLog(`[ERROR] Notification ${logId} delivery failed on channel ${log.channel} after ${finalDelay}ms.`);
      } else {
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: 'SENT',
            latencyMs: finalDelay
          }
        });

        telemetryMetrics.processingCount = Math.max(0, telemetryMetrics.processingCount - 1);
        telemetryMetrics.sentCount++;

        // Update average latency metric
        const prevTotal = telemetryMetrics.avgLatencyMs * (telemetryMetrics.sentCount - 1);
        telemetryMetrics.avgLatencyMs = Math.round((prevTotal + finalDelay) / telemetryMetrics.sentCount);

        // Acknowledge broker messages
        if (broker === 'KAFKA') {
          // Decrement lag on a random partition
          const targetPart = telemetryMetrics.kafkaPartitions.find(p => p.lag > 0);
          if (targetPart) targetPart.lag = Math.max(0, targetPart.lag - 1);
          addBrokerLog(`[Kafka Consumer] Message committed successfully. Offset updated. Channel: ${log.channel} -> Recipient: ${log.recipient}`);
        } else if (broker === 'RABBITMQ') {
          const queueObj = telemetryMetrics.rabbitmqQueues[0];
          queueObj.messages = Math.max(0, queueObj.messages - 1);
          queueObj.acked++;
          addBrokerLog(`[RabbitMQ Worker] BasicACK issued for channel ${log.channel}. Message finalized.`);
        } else if (broker === 'AWS_SQS') {
          const sqs = telemetryMetrics.awsSqsQueues[0];
          sqs.messagesVisible = Math.max(0, sqs.messagesVisible - 1);
          addBrokerLog(`[AWS SQS Worker] DeleteMessageRequest processed. ReceiptHandle deleted. Channel: ${log.channel}`);
        }
      }
    } catch (err) {
      console.error('Simulated worker process failed:', err);
    }
  }, processingDelay);
};
