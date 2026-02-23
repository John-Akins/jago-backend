import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service'; // Import UserService
import { AuthModule } from '../auth/auth.module'; // Import AuthModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Wallet } from '../wallet/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Wallet]), // Import User and Wallet entities for this module
    forwardRef(() => AuthModule),
  ],
  providers: [UserService], // Provide UserService
  controllers: [UserController],
  exports: [UserService], // Export UserService to make it available to other modules
})
export class UserModule {}
