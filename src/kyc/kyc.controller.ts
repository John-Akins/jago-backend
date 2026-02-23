import { Controller, Post, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { KycDto } from '../dto/kyc.dto';
import { Kyc } from './kyc.entity';
import { IdentificationType } from '../dto/kyc.dto';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit KYC details for a user (BVN verification)' })
  @ApiBody({ type: KycDto })
  @ApiResponse({ status: 201, description: 'KYC details submitted and verified successfully' })
  @ApiResponse({ status: 400, description: 'KYC already submitted, invalid BVN, or invalid data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async submitKyc(@Body() kycDto: KycDto) {
    return this.kycService.submitKyc(kycDto.userId, kycDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get KYC details by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'KYC details found', type: Kyc })
  @ApiResponse({ status: 404, description: 'KYC details not found' })
  async getKycByUserId(@Param('userId') userId: string): Promise<Kyc> {
    return this.kycService.getKycByUserId(userId);
  }

  @Get(':kycId')
  @ApiOperation({ summary: 'Get KYC details by KYC ID' })
  @ApiParam({ name: 'kycId', description: 'KYC ID' })
  @ApiResponse({ status: 200, description: 'KYC details found', type: Kyc })
  @ApiResponse({ status: 404, description: 'KYC details not found' })
  async getKycById(@Param('kycId') kycId: string): Promise<Kyc> {
    return this.kycService.getKycById(kycId);
  }

  @Put(':kycId/status')
  @ApiOperation({ summary: 'Update KYC verification status' })
  @ApiParam({ name: 'kycId', description: 'KYC ID' })
  @ApiQuery({ name: 'status', enum: ['PENDING', 'VERIFIED', 'REJECTED'], description: 'New status' })
  @ApiQuery({ name: 'rejectionReason', required: false, description: 'Reason for rejection (required if status is REJECTED)' })
  @ApiResponse({ status: 200, description: 'KYC status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status or missing rejection reason' })
  @ApiResponse({ status: 404, description: 'KYC details not found' })
  async updateKycStatus(
    @Param('kycId') kycId: string,
    @Query('status') status: string,
    @Query('rejectionReason') rejectionReason?: string
  ): Promise<{ message: string }> {
    return this.kycService.updateKycStatus(kycId, status, rejectionReason);
  }

  @Get('user/:userId/with-details')
  @ApiOperation({ summary: 'Get user details with KYC information' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User and KYC details found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserWithKyc(@Param('userId') userId: string): Promise<{ user: any; kyc?: Kyc }> {
    return this.kycService.getUserWithKyc(userId);
  }
}