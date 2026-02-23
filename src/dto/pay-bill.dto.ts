import { IsNumber, IsString, IsPositive, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BillType {
  AIRTIME = 'AIRTIME',
  CABLE_TV = 'CABLE_TV',
}

export class PayBillDto {
  @ApiProperty({
    description: 'Type of bill to pay',
    enum: BillType,
    example: BillType.AIRTIME
  })
  @IsEnum(BillType)
  @IsNotEmpty()
  billType: BillType;

  @ApiProperty({
    description: 'Biller code for the service',
    example: 'AIRTEL'
  })
  @IsString()
  @IsNotEmpty()
  billerCode: string;

  @ApiProperty({
    description: 'Amount to pay',
    example: 500,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Customer ID (phone number for airtime, smartcard for cable)',
    example: '08012345678'
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;
}
