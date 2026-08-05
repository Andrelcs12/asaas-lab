import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { AppConfigService } from './common/config/app-config.service';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  await configureApp(app);

  const config = app.get(AppConfigService);
  const port = config.port;
  await app.listen(port, '0.0.0.0');

  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger on http://localhost:${port}/docs`);
}

bootstrap();
