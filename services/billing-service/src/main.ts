import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { SnakeCaseInterceptor } from "./common/snake-case.interceptor";

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

  const port = process.env.PORT ?? 8003;
  await app.listen(port);
  console.log(`📄 Billing service running on http://127.0.0.1:${port}`);
}
bootstrap();
