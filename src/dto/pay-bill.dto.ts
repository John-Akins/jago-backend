import { IsNumber, IsString, IsPositive, IsNotEmpty, IsEnum, Length, Matches } from 'class-validator';
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

  @ApiProperty({
    description: '4-digit shortcode for transaction verification',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @Length(4, 4, { message: 'Shortcode must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Shortcode must be a 4-digit number' })
  shortcode: string;
}
