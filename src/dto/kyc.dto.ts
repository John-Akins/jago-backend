import { IsString, Length, Matches, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum IdentificationType {
  NATIONAL_ID = 'NATIONAL_ID',
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  VOTERS_CARD = 'VOTERS_CARD'
}

export class KycDto {
  @ApiProperty({
    description: 'User ID associated with this KYC submission',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Bank Verification Number (BVN)',
    example: '12345678901'
  })
  @IsString()
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^[0-9]{11}$/, { message: 'BVN must contain only digits' })
  bvn: string;

  @ApiProperty({
    description: 'Type of identification document (for future extensibility)',
    enum: IdentificationType,
    example: IdentificationType.NATIONAL_ID,
    required: false
  })
  @IsOptional()
  @IsEnum(IdentificationType)
  identificationType?: IdentificationType;
}