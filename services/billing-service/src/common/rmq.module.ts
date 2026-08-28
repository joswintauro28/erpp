import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { connect } from "amqplib";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "AMQP_CONNECTION",
      useFactory: async (configService: ConfigService): Promise<any> => {
        // L3: requires RABBITMQ_URL in production
        const url = configService.get<string>("RABBITMQ_URL") ?? "amqp://guest:guest@localhost:5672";
        try {
          return await connect(url);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Failed to connect to RabbitMQ: ${(err as any).message}`);
          throw err;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: "AMQP_CHANNEL",
      useFactory: async (connection: any): Promise<any> => {
        const channel = await connection.createChannel();
        await channel.assertExchange("erp_events", "topic", { durable: true });
        
        await channel.assertQueue("shipment_dispatched_billing_queue", { durable: true });
        await channel.bindQueue("shipment_dispatched_billing_queue", "erp_events", "inventory.shipment.dispatched");
        
        await channel.assertQueue("po_created_ap_queue", { durable: true });
        await channel.bindQueue("po_created_ap_queue", "erp_events", "inventory.po.created");

        return channel;
      },
      inject: ["AMQP_CONNECTION"],
    },
  ],
  exports: ["AMQP_CHANNEL"],
})
export class RmqModule {}
