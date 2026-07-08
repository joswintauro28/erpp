import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable cookies parsing
  app.use(cookieParser());

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Enable CORS dynamically to support localhost and any .erp.local subdomains
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|.*\.erp\.local)(:\d+)?$/)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 8002;
  console.log(`core-iam is running on: http://localhost:${port}/api`);
  await app.listen(port);
}
bootstrap();
