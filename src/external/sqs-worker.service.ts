import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MockSqsService, SqsMessageRecord, BillPaymentMessage } from './mock-sqs.service';
import { MockBillerService } from './mock-biller.service';
import { MockNotificationService } from './mock-notification.service';

/**
 * Callback interface for handling payment results.
 * The WalletService implements this to handle reversals.
 */
export interface PaymentResultHandler {
  handlePaymentResult(message: SqsMessageRecord, result: { success: boolean; error?: string }): Promise<void>;
}

@Injectable()
export class SqsWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsWorkerService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs = 2000; // Poll every 2 seconds
  private paymentResultHandler: PaymentResultHandler | null = null;

  constructor(
    private readonly mockSqsService: MockSqsService,
    private readonly mockBillerService: MockBillerService,
    private readonly mockNotificationService: MockNotificationService,
  ) {}

  /**
   * Register the payment result handler (WalletService).
   */
  setPaymentResultHandler(handler: PaymentResultHandler): void {
    this.paymentResultHandler = handler;
  }

  /**
   * Start the background worker when module initializes.
   */
  onModuleInit() {
    this.logger.log('Starting SQS background worker...');
    this.startWorker();
  }

  /**
   * Stop the background worker when module is destroyed.
   */
  onModuleDestroy() {
    this.stopWorker();
  }

  /**
   * Start the polling worker.
   */
  startWorker(): void {
    if (this.intervalId) {
      return; // Already running
    }
    
    this.intervalId = setInterval(() => {
      this.processPendingMessages().catch(error => {
        this.logger.error(`Error processing pending messages: ${error.message}`);
      });
    }, this.pollIntervalMs);
    
    this.logger.log(`SQS worker started. Polling every ${this.pollIntervalMs}ms`);
  }

  /**
   * Stop the polling worker.
   */
  stopWorker(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('SQS worker stopped');
    }
  }

  /**
   * Process all pending messages in the queue.
   */
  async processPendingMessages(): Promise<void> {
    const pendingMessages = await this.mockSqsService.getMessagesByStatus('PENDING');
    
    if (pendingMessages.length === 0) {
      return; // No pending messages
    }
    
    this.logger.log(`Processing ${pendingMessages.length} pending message(s)`);
    
    for (const message of pendingMessages) {
      await this.processMessage(message);
    }
  }

  /**
   * Process a single message.
   */
  private async processMessage(message: SqsMessageRecord): Promise<void> {
    this.logger.log(`Processing message for transaction: ${message.transactionId}`);
    
    // Update status to PROCESSING
    await this.mockSqsService.updateMessageStatus(message.transactionId, 'PROCESSING');
    
    // Call the mocked bill payment API
    let success = false;
    let error: string | undefined;
    
    try {
      const result = await this.mockBillerService.payBill(
        message.billType,
        message.customerId,
        message.amount,
      );
      
      success = true;
      this.logger.log(`Bill payment successful for transaction: ${message.transactionId}`);
      
      // Update message with success
      await this.mockSqsService.updateMessageStatus(message.transactionId, 'SUCCESS', {
        providerTxnId: result.providerTxnId,
      });
      
      // Send success notification
      await this.mockNotificationService.notifyBillPaymentSuccess(
        message.userId,
        message.transactionId,
        message.amount,
        message.billType,
        message.customerId,
      );
      
    } catch (err) {
      error = err.message;
      this.logger.error(`Bill payment failed for transaction: ${message.transactionId}. Error: ${error}`);
      
      // Update message with failure
      await this.mockSqsService.updateMessageStatus(message.transactionId, 'FAILURE', {
        errorMessage: error,
      });
      
      // Send immediate failure notification
      await this.mockNotificationService.notifyBillPaymentFailure(
        message.userId,
        message.transactionId,
        message.amount,
        message.billType,
        message.customerId,
        error,
      );
    }
    
    // Notify the handler (WalletService) about the result
    if (this.paymentResultHandler) {
      await this.paymentResultHandler.handlePaymentResult(message, { success, error });
    }
  }

  /**
   * Check if the worker is currently running.
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}