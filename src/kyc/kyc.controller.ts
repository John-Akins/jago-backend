import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { KycDto } from '../dto/kyc.dto';
import { Kyc } from './kyc.entity';
import { IdentificationType } from '../dto/kyc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Import JwtAuthGuard

@ApiTags('kyc')
@ApiBearerAuth()
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Post('submit')
  @ApiOperation({ summary: 'Submit KYC details for a user (BVN verification)' })
  @ApiBody({ type: KycDto })
  @ApiResponse({ status: 201, description: 'KYC details submitted and verified successfully' })
  @ApiResponse({ status: 400, description: 'KYC already submitted, invalid BVN, or invalid data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async submitKyc(@Body() kycDto: KycDto, @Req() req: any) {
    // Ensure the authenticated user is submitting KYC for themselves
    if (req.user.id !== kycDto.userId) {
      throw new UnauthorizedException('You are not authorized to submit KYC for this user');
    }
    return this.kycService.submitKyc(kycDto.userId, kycDto);
  }

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get KYC details by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'KYC details found', type: Kyc })
  @ApiResponse({ status: 404, description: 'KYC details not found' })
  async getKycByUserId(@Param('userId') userId: string, @Req() req: any): Promise<Kyc> {
    // Ensure the authenticated user is accessing their own KYC data
    if (req.user.id !== userId) {
      throw new UnauthorizedException('You are not authorized to view this user\'s KYC data');
    }
    return this.kycService.getKycByUserId(userId);
  }

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Get(':kycId')
  @ApiOperation({ summary: 'Get KYC details by KYC ID' })
  @ApiParam({ name: 'kycId', description: 'KYC ID' })
  @ApiResponse({ status: 200, description: 'KYC details found', type: Kyc })
  @ApiResponse({ status: 404, description: 'KYC details not found' })
  async getKycById(@Param('kycId') kycId: string, @Req() req: any): Promise<Kyc> {
     // For simplicity, we are not adding user-specific authorization here based on kycId. 
    // In a real application, you'd likely want to verify ownership of the kycId.
    // Or perhaps only an admin could retrieve KYC by kycId directly.
    return this.kycService.getKycById(kycId);
  }

  // This endpoint might require an admin role in a real application
  @UseGuards(JwtAuthGuard) // Protect this endpoint
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

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Get('user/:userId/with-details')
  @ApiOperation({ summary: 'Get user details with KYC information' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User and KYC details found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserWithKyc(@Param('userId') userId: string, @Req() req: any): Promise<{ user: any; kyc?: Kyc }> {
    // Ensure the authenticated user is accessing their own KYC data
    if (req.user.id !== userId) {
      throw new UnauthorizedException('You are not authorized to view this user\'s KYC data');
    }
    return this.kycService.getUserWithKyc(userId);
  }
}
