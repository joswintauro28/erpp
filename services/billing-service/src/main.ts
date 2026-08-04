import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { SnakeCaseInterceptor } from "./common/snake-case.interceptor";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

  app.useGlobalInterceptors(new SnakeCaseInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

  app.enableCors({
    origin: [...corsOrigins, /\.erp\.local$/],
    credentials: true,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672"],
      exchange: "erp_events",
      exchangeType: "topic",
      routingKey: "inventory.shipment.dispatched",
      queue: "shipment_dispatched_billing_queue",
      queueOptions: {
        durable: true,
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672"],
      exchange: "erp_events",
      exchangeType: "topic",
      routingKey: "inventory.po.created",
      queue: "po_created_ap_queue",
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT ?? 8003;
  await app.listen(port);
  console.log(`📄 Billing service running on http://127.0.0.1:${port}`);
}
bootstrap();
