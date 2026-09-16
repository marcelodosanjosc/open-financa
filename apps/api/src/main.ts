import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger Documentation setup
  const config = new DocumentBuilder()
    .setTitle('Open Finança API')
    .setDescription(
      'API REST para gestão financeira pessoal, conciliação bancária, automação de cartões de crédito e motor de quitação de dívidas.',
    )
    .setVersion('1.0.0')
    .addTag('Auth')
    .addTag('Accounts')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .addTag('Categories')
    .addTag('Budgets')
    .addTag('Transactions')
    .addTag('Credit Cards')
    .addTag('Invoices')
    .addTag('Debt Payoff')
    .addTag('Statement Import')
    .addTag('Dashboard')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Open Finança API is running on: http://localhost:${port}/api`);
  logger.log(`📖 Swagger API Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
