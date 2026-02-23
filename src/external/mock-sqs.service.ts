import { Injectable, Logger } from '@nestjs/common';
import { MockBillerService } from './mock-biller.service';
import { BillType } from '../dto/pay-bill.dto';

export interface SqsMessageRecord {
  id: string;
  transactionId: string;
  userId: string;
  billType: BillType;
  billerCode: string;
  customerId: string;
  amount: number;
  amountInKobo: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE';
  providerTxnId?: string;
  errorMessage?: string;
  messageId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillPaymentMessage {
  transactionId: string;
  userId: string;
  billType: BillType;
  billerCode: string;
  customerId: string;
  amount: number;
  amountInKobo: number;
  createdAt: Date;
}

export interface BillPaymentResult {
  transactionId: string;
  success: boolean;
  providerTxnId?: string;
  message: string;
  error?: string;
}

@Injectable()
export class MockSqsService {
  private readonly logger = new Logger(MockSqsService.name);
  private messageStore: SqsMessageRecord[] = [];
  private processingDelay = 500; // Simulated SQS processing delay in ms

  constructor(private readonly mockBillerService: MockBillerService) {}

  /**
   * Send a bill payment message to the mock SQS queue.
   * This simulates sending a message to AWS SQS and stores it in memory.
   */
  async sendMessage(message: BillPaymentMessage): Promise<{ messageId: string; status: string }> {
    const messageId = `sqs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.logger.log(`Sending message to SQS queue: ${messageId}`);
    this.logger.debug(`Message content: ${JSON.stringify(message)}`);
    
    const now = new Date();
    
    // Create and store the message in memory with PENDING status
    const sqsMessage: SqsMessageRecord = {
      id,
      transactionId: message.transactionId,
      userId: message.userId,
      billType: message.billType,
      billerCode: message.billerCode,
      customerId: message.customerId,
      amount: message.amount,
      amountInKobo: message.amountInKobo,
      status: 'PENDING',
      messageId: messageId,
      createdAt: now,
      updatedAt: now,
    };
    
    this.messageStore.push(sqsMessage);
    
    this.logger.log(`Message ${messageId} queued successfully with status PENDING. Message ID: ${id}`);
    
    return {
      messageId,
      status: 'PENDING',
    };
  }

  /**
   * Process a message from the queue by calling the external bill payment API.
   * This simulates SQS triggering a Lambda consumer that calls the biller.
   */
  async processMessage(message: BillPaymentMessage): Promise<BillPaymentResult> {
    this.logger.log(`Processing SQS message for transaction: ${message.transactionId}`);
    
    // Simulate SQS processing delay
    await this.simulateDelay();
    
    try {
      // Call the mocked external bill payment API
      const result = await this.mockBillerService.payBill(
        message.billType,
        message.customerId,
        message.amount,
      );
      
      this.logger.log(`Bill payment successful for transaction: ${message.transactionId}`);
      
      return {
        transactionId: message.transactionId,
        success: true,
        providerTxnId: result.providerTxnId,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Bill payment failed for transaction: ${message.transactionId}. Error: ${error.message}`);
      
      return {
        transactionId: message.transactionId,
        success: false,
        message: 'Bill payment failed',
        error: error.message,
      };
    }
  }

  /**
   * Process the bill payment synchronously (for simplicity in this mock).
   * In a real system, this would be handled by a separate consumer service.
   */
  async processBillPayment(message: BillPaymentMessage): Promise<BillPaymentResult> {
    // Find and update message status to PROCESSING
    const msgIndex = this.messageStore.findIndex(m => m.transactionId === message.transactionId);
    if (msgIndex > -1) {
      this.messageStore[msgIndex].status = 'PROCESSING';
      this.messageStore[msgIndex].updatedAt = new Date();
    }
    
    const result = await this.processMessage(message);
    
    // Update message status in memory based on result
    if (msgIndex > -1) {
      if (result.success) {
        this.messageStore[msgIndex].status = 'SUCCESS';
        this.messageStore[msgIndex].providerTxnId = result.providerTxnId;
      } else {
        this.messageStore[msgIndex].status = 'FAILURE';
        this.messageStore[msgIndex].errorMessage = result.error;
      }
      this.messageStore[msgIndex].updatedAt = new Date();
    }
    
    return result;
  }

  /**
   * Get the current queue depth (messages with PENDING status).
   */
  async getQueueDepth(): Promise<number> {
    return this.messageStore.filter(m => m.status === 'PENDING').length;
  }

  /**
   * Get all messages (for testing/debugging).
   */
  async getAllMessages(): Promise<SqsMessageRecord[]> {
    return [...this.messageStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get messages by status.
   */
  async getMessagesByStatus(status: string): Promise<SqsMessageRecord[]> {
    return this.messageStore
      .filter(m => m.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get a message by transaction ID.
   */
  async getMessageByTransactionId(transactionId: string): Promise<SqsMessageRecord | null> {
    return this.messageStore.find(m => m.transactionId === transactionId) || null;
  }

  /**
   * Update message status and other fields.
   */
  async updateMessageStatus(
    transactionId: string,
    status: SqsMessageRecord['status'],
    options?: { providerTxnId?: string; errorMessage?: string }
  ): Promise<void> {
    const msgIndex = this.messageStore.findIndex(m => m.transactionId === transactionId);
    if (msgIndex > -1) {
      this.messageStore[msgIndex].status = status;
      this.messageStore[msgIndex].updatedAt = new Date();
      if (options?.providerTxnId) {
        this.messageStore[msgIndex].providerTxnId = options.providerTxnId;
      }
      if (options?.errorMessage) {
        this.messageStore[msgIndex].errorMessage = options.errorMessage;
      }
    }
  }

  /**
   * Clear all messages (for testing).
   */
  async clearQueue(): Promise<void> {
    this.messageStore = [];
  }

  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.processingDelay));
  }
}