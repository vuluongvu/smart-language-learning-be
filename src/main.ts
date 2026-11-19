import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { parseCorsOrigins } from './common/utils/cors.util.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust the first reverse proxy hop (AWS ALB / CloudFront / Caddy / Nginx) so throttling uses client IP
  app.set('trust proxy', 1);

  // enable global validate pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove not allowed fields
      forbidNonWhitelisted: true, // wrong filed -> return 400
      transform: true, // convert type (string -> number...)
    }),
  );

  // set global prefix api/v1/...
  app.setGlobalPrefix('api/v1');

  // enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // use helmet with Google Sign-In popup & cross-origin SPA compatibility
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // enable CORS using strict allowlist parsing
  app.enableCors({
    origin: parseCorsOrigins(process.env.CORS_ORIGIN, process.env.NODE_ENV),
    credentials: true,
  });

  // use global interceptor for class serialization
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // setup swagger documentation at /api/docs outside production unless explicitly enabled
  const enableSwagger =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Argon Learning API')
      .setDescription('Argon Learning English self-learning platform REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // start the application
  const server = await app.listen(process.env.PORT ?? 3000);
  // Keep idle HTTP connections alive longer than AWS ALB's 60s timeout to prevent 502 resets,
  // and give multi-step AI generation requests generous time to complete.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 180_000;
}
// start the application
await bootstrap();
