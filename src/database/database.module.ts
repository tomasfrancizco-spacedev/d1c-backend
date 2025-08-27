import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('POSTGRES_HOST');
        const isLocalhost = host === 'localhost' || host === '127.0.0.1';
        return ({
          type: 'postgres',
          host: configService.get('POSTGRES_HOST'),
          port: configService.get('POSTGRES_PORT'),
          username: configService.get('POSTGRES_USER'),
          password: configService.get('POSTGRES_PASSWORD'),
          database: configService.get('POSTGRES_DB'),
          entities: [`${__dirname}/../**/*.entity.*`],
          migrations: [`${__dirname}/migrations/*{.ts,.js}`],
          synchronize: false,
          migrationsRun: !isLocalhost,
          logging: configService.get('NODE_ENV') === 'development',
          ...(isLocalhost ? {} : {
            ssl: {
              rejectUnauthorized: false
            }
          })
        })
      },
    }),
  ],
})
export class DatabaseModule { }
