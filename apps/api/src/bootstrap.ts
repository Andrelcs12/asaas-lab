import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppConfigService } from './common/config/app-config.service';

export async function configureApp(app: NestFastifyApplication): Promise<void> {
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
}
