import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { MockBillerService } from '../external/mock-biller.service';
import { Wallet } from './wallet.entity';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module'; // Import UserModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, User]),
    UserModule, // Import UserModule here
  ],
  controllers: [WalletController],
  providers: [WalletService, MockBillerService],
  exports: [WalletService],
})
export class WalletModule {}
