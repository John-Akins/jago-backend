import { IsNumber, IsString, IsPositive, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({
    description: 'Amount to fund the wallet with',
    example: 1000,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Currency of the amount',
    example: 'NGN',
    default: 'NGN'
  })
  @IsString()
  @IsNotEmpty()
  currency: string;
}
