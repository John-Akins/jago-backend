import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from './wallet/wallet.module';
import { UserModule } from './user/user.module';
import { KycModule } from './kyc/kyc.module';
import { AuthModule } from './auth/auth.module'; // Import AuthModule
import { DatabaseConfigService } from './config/database.config';

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
    AuthModule, // Add AuthModule to imports
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
