import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { SnakeCaseInterceptor } from "./common/snake-case.interceptor";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

  // Security headers middleware
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!req.url.startsWith('/docs') && !req.url.startsWith('/redoc') && !req.url.startsWith('/openapi.json')) {
      res.setHeader('Content-Security-Policy', "default-src 'self'");
    }
    next();
  });

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
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
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
      urls: [process.env.RABBITMQ_URL || "amqp://localhost:5672"],
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
