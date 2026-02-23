import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { Kyc } from '../kyc/kyc.entity';
import { Wallet } from '../wallet/wallet.entity';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const environment = this.configService.get<string>('NODE_ENV');

    const isSyncedEnv = !(environment === 'production');
    const commonOptions = {
      entities: [User, Kyc, Wallet],
      synchronize: isSyncedEnv, // Should be false in production
      logging: false,
    };

    switch (environment) {
      case 'test':
      case 'development':
        return {
          type: 'sqlite',
          database: `./${environment}.db`,
          ...commonOptions,
        };
      case 'production':
        return {
          type: 'postgres',
          host: this.configService.get<string>('DB_HOST'),
          port: this.configService.get<number>('DB_PORT'),
          username: this.configService.get<string>('DB_USERNAME'),
          password: this.configService.get<string>('DB_PASSWORD'),
          database: this.configService.get<string>('DB_DATABASE'),
          ...commonOptions,
        };
      default:
        // Default to development for local testing if NODE_ENV is not set
        return {
          type: 'sqlite',
          database: './development.db',
          ...commonOptions,
        };
    }
  }
}
