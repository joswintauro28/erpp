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

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : [];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
      } else if (corsOrigins.includes(origin)) {
        callback(null, true);
      } else if (
        origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/) ||
        corsOrigins.some((o) => origin === o)
      ) {
        callback(null, true);
      } else {
        // Deny the CORS headers instead of failing the request. Browsers always
        // attach an Origin header to POSTs (e.g. /auth/login), and all
        // workstation traffic is same-origin behind nginx — erroring here turned
        // any Origin missing from CORS_ORIGINS into an HTTP 500 on login.
        // The browser still enforces CORS by withholding cross-origin access.
        callback(null, false);
      }
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 8002;
  console.log(`core-iam is running on: http://localhost:${port}/api`);
  await app.listen(port);
}
bootstrap();
