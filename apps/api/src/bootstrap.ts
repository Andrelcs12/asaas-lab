import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppConfigService } from './common/config/app-config.service';

let cachedApp: NestFastifyApplication | undefined;

export function resetAppCache(): void {
  cachedApp = undefined;
}

export async function createApp(): Promise<NestFastifyApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const config = app.get(AppConfigService);

  await app.register(fastifyHelmet);

  app.enableCors({
    origin: config.webUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Asaas Payment Lab API')
    .setDescription('Laboratório para estudo dos fluxos de pagamento do Asaas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  cachedApp = app;
  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(AppConfigService);
  const port = config.port;

  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger on http://localhost:${port}/docs`);
}
