import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { FundWalletDto } from '../dto/fund-wallet.dto';
import { PayBillDto } from '../dto/pay-bill.dto';
import { MockBillerService } from '../external/mock-biller.service';

// Conversion constants for NGN/Kobo
const KOBO_PER_NAIRA = 100;

// Helper functions for Naira <-> Kobo conversion
const nairaToKobo = (naira: number): number => Math.round(naira * KOBO_PER_NAIRA);
const koboToNaira = (kobo: number): number => kobo / KOBO_PER_NAIRA;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private mockBillerService: MockBillerService,
  ) {}

  // --- PUBLIC API ---

  async fundWallet(userId: string, dto: FundWalletDto) {
    // Validate amount is positive
    if (dto.amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    // Get user's wallet
    const wallet = await this.getWalletByUserId(userId);

    // Convert amount to kobo for storage
    const amountInKobo = nairaToKobo(dto.amount);

    // Update balance (stored in kobo)
    wallet.balance = Number(wallet.balance) + amountInKobo;
    await this.walletRepository.save(wallet);

    return {
      transactionId: `txn_fund_${Date.now()}`,
      status: 'COMPLETED',
      type: 'FUNDING',
      userId,
      amount: dto.amount, // Return in Naira for API response
      currency: wallet.currency,
      completedAt: new Date().toISOString(),
      message: `Successfully funded wallet with ${dto.amount} ${wallet.currency}`
    };
  }

  async payBill(userId: string, dto: PayBillDto) {
    // Validate bill type is valid
    if (!Object.values(['AIRTIME', 'CABLE_TV']).includes(dto.billType)) {
      throw new BadRequestException('billType must be a valid enum value');
    }

    // Get user's wallet
    const wallet = await this.getWalletByUserId(userId);

    // Convert amount to kobo for comparison and storage
    const amountInKobo = nairaToKobo(dto.amount);

    // Check if user has sufficient balance (both in kobo)
    if (Number(wallet.balance) < amountInKobo) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Deduct from wallet (stored in kobo)
    wallet.balance = Number(wallet.balance) - amountInKobo;
    await this.walletRepository.save(wallet);

    return {
      transactionId: `txn_bill_${Date.now()}`,
      status: 'COMPLETED',
      type: 'BILL_PAYMENT',
      userId,
      billType: dto.billType,
      billerCode: dto.billerCode,
      customerId: dto.customerId,
      amount: dto.amount, // Return in Naira for API response
      completedAt: new Date().toISOString(),
      message: `Successfully paid ${dto.billType} bill for customer ${dto.customerId}`
    };
  }

  // --- GETTERS ---

  async getBalance(userId: string) {
    const wallet = await this.getWalletByUserId(userId);

    return {
      userId,
      availableBalance: koboToNaira(Number(wallet.balance)), // Convert to Naira for API response
      currency: wallet.currency,
      lastUpdated: wallet.updatedAt.toISOString()
    };
  }

  async getTransactionStatus(transactionId: string) {
    // Static response for transaction status
    return {
      transactionId,
      status: 'COMPLETED',
      type: 'FUNDING',
      userId: 'user123',
      amount: 1000, // In Naira
      currency: 'NGN',
      completedAt: new Date().toISOString(),
      message: 'Transaction completed successfully'
    };
  }

  // --- HELPERS ---

  private async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }
    return wallet;
  }
}