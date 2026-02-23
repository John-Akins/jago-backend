import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from '../src/wallet/wallet.module';
import { UserModule } from '../src/user/user.module';
import { KycModule } from '../src/kyc/kyc.module';
import { DatabaseConfigService } from '../src/config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService,
    }),
    WalletModule,
    UserModule,
    KycModule,
  ],
})
export class TestModule {}