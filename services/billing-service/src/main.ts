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

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      /\.erp\.local$/,
    ],
    credentials: true,
  });

  const port = process.env.PORT ?? 8003;
  await app.listen(port);
  console.log(`📄 Billing service running on http://127.0.0.1:${port}`);
}
bootstrap();
