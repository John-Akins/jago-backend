import { Controller, Get, Post, Body, Param, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { PayBillDto } from '../dto/pay-bill.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Import JwtAuthGuard

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Post(':userId/fund')
  @ApiOperation({ summary: 'Fund a user wallet' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: FundWalletDto })
  @ApiResponse({ status: 200, description: 'Funding successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async fundWallet(@Param('userId') userId: string, @Body() dto: FundWalletDto, @Req() req: any) {
    // Ensure the authenticated user is funding their own wallet
    if (req.user.id !== userId) {
      throw new UnauthorizedException('You are not authorized to fund this wallet');
    }
    return this.walletService.fundWallet(userId, dto);
  }

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Post(':userId/pay-bill')
  @ApiOperation({ summary: 'Pay a bill' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: PayBillDto })
  @ApiResponse({ status: 200, description: 'Bill payment successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async payBill(@Param('userId') userId: string, @Body() dto: PayBillDto, @Req() req: any) {
    // Ensure the authenticated user is paying from their own wallet
    if (req.user.id !== userId) {
      throw new UnauthorizedException('You are not authorized to pay bills from this wallet');
    }
    return this.walletService.payBill(userId, dto);
  }

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Get(':userId/balance')
  @ApiOperation({ summary: 'Get user wallet balance' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async checkBalance(@Param('userId') userId: string, @Req() req: any) {
    // Ensure the authenticated user is checking their own wallet balance
    if (req.user.id !== userId) {
      throw new UnauthorizedException('You are not authorized to view this wallet\'s balance');
    }
    return this.walletService.getBalance(userId);
  }

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Get('transactions/:transactionId/status')
  @ApiOperation({ summary: 'Get transaction status' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction status retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionStatus(@Param('transactionId') transactionId: string, @Req() req: any) {
    // Note: For simplicity, we are not adding user-specific authorization here based on transactionId.
    // In a real application, you'd want to verify if the authenticated user owns this transaction.
    return this.walletService.getTransactionStatus(transactionId);
  }
}
