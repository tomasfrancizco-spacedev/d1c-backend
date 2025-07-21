import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

const { PORT = 3000, API_VERSION = 'v1' } = process.env;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('v1');
  
  // Enable validation pipes globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const options = new DocumentBuilder()
    .setTitle(`D1C API Backend`)
    .setDescription(`The Nest D1C API Backend is an API where users can test the D1C Endpoints`)
    .setVersion('1.0')
    .addTag('D1C-API')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(`${API_VERSION}/doc-api`, app, document);

  await app.listen(PORT);
  Logger.log(`Server running on http://localhost:${PORT}`);
}
bootstrap();
