import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const { 
  PORT = 3000, 
  API_VERSION = 'v1',
  SWAGGER_USERNAME = 'admin',
  SWAGGER_PASSWORD = 'password'
} = process.env;

// Basic Auth middleware for Swagger
function basicAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    return res.status(401).send('Authentication required');
  }

  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic') {
    return res.status(401).send('Invalid authentication scheme');
  }

  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');

  if (username === SWAGGER_USERNAME && password === SWAGGER_PASSWORD) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
  return res.status(401).send('Invalid credentials');
}

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
  // Apply basic auth middleware to Swagger routes
  app.use(`/${API_VERSION}/doc-api`, basicAuth);
  app.use(`/${API_VERSION}/doc-api-json`, basicAuth);

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(`${API_VERSION}/doc-api`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'D1C API Documentation',
    customfavIcon: '',
    customCss: '',
    swaggerUrl: `/${API_VERSION}/doc-api-json`,
    explorer: true,
    swaggerUiEnabled: true,
  });

  await app.listen(PORT);
  Logger.log(`Server running on http://localhost:${PORT}`);
}
bootstrap();
