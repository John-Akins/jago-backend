import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { Kyc } from './kyc.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Kyc, User])],
  providers: [KycService],
  controllers: [KycController],
  exports: [KycService],
})
export class KycModule {}