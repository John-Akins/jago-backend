import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { PayBillDto } from '../dto/pay-bill.dto';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post(':userId/fund')
  @ApiOperation({ summary: 'Fund a user wallet' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: FundWalletDto })
  @ApiResponse({ status: 200, description: 'Funding successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  fundWallet(@Param('userId') userId: string, @Body() dto: FundWalletDto) {
    return this.walletService.fundWallet(userId, dto);
  }

  @Post(':userId/pay-bill')
  @ApiOperation({ summary: 'Pay a bill' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: PayBillDto })
  @ApiResponse({ status: 200, description: 'Bill payment successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  payBill(@Param('userId') userId: string, @Body() dto: PayBillDto) {
    return this.walletService.payBill(userId, dto);
  }

  @Get(':userId/balance')
  @ApiOperation({ summary: 'Get user wallet balance' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  checkBalance(@Param('userId') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Get('transactions/:transactionId/status')
  @ApiOperation({ summary: 'Get transaction status' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction status retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  getTransactionStatus(@Param('transactionId') transactionId: string) {
    return this.walletService.getTransactionStatus(transactionId);
  }
}
