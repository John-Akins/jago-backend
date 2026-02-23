import { Injectable, Logger } from '@nestjs/common';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: 'SMS' | 'EMAIL' | 'PUSH';
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  notificationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPayload {
  userId: string;
  type: 'SMS' | 'EMAIL' | 'PUSH';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  notificationId: string;
  status: 'SENT' | 'FAILED';
  timestamp: Date;
}

@Injectable()
export class MockNotificationService {
  private readonly logger = new Logger(MockNotificationService.name);
  private notificationStore: NotificationRecord[] = [];

  /**
   * Send a notification to the user.
   * This mocks sending SMS, Email, or Push notifications and stores in memory.
   */
  async sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const id = `notif_record_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.logger.log(`Sending ${payload.type} notification to user ${payload.userId}`);
    this.logger.debug(`Notification details: ${JSON.stringify(payload)}`);
    
    const now = new Date();
    
    // Create and store notification in memory
    const notification: NotificationRecord = {
      id,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      status: 'PENDING',
      metadata: payload.metadata,
      createdAt: now,
      updatedAt: now,
    };
    
    this.notificationStore.push(notification);
    
    // Simulate sending delay
    await this.simulateDelay();
    
    // Update status to SENT
    const index = this.notificationStore.findIndex(n => n.id === id);
    if (index > -1) {
      this.notificationStore[index].status = 'SENT';
      this.notificationStore[index].notificationId = notificationId;
      this.notificationStore[index].updatedAt = new Date();
    }
    
    this.logger.log(`Notification ${notificationId} sent successfully`);
    
    return {
      notificationId,
      status: 'SENT',
      timestamp: new Date(),
    };
  }

  /**
   * Send bill payment success notification.
   */
  async notifyBillPaymentSuccess(
    userId: string,
    transactionId: string,
    amount: number,
    billType: string,
    customerId: string,
  ): Promise<NotificationResult> {
    return this.sendNotification({
      userId,
      type: 'SMS',
      title: 'Bill Payment Successful',
      message: `Your ${billType} payment of ${amount} NGN to ${customerId} was successful. Transaction ID: ${transactionId}`,
      metadata: { transactionId, amount, billType, customerId },
    });
  }

  /**
   * Send bill payment failure notification.
   */
  async notifyBillPaymentFailure(
    userId: string,
    transactionId: string,
    amount: number,
    billType: string,
    customerId: string,
    reason: string,
  ): Promise<NotificationResult> {
    return this.sendNotification({
      userId,
      type: 'SMS',
      title: 'Bill Payment Failed',
      message: `Your ${billType} payment of ${amount} NGN to ${customerId} failed. Reason: ${reason}. Amount has been reversed to your wallet.`,
      metadata: { transactionId, amount, billType, customerId, reason },
    });
  }

  /**
   * Send wallet reversal notification.
   */
  async notifyWalletReversal(
    userId: string,
    transactionId: string,
    amount: number,
    reason: string,
  ): Promise<NotificationResult> {
    return this.sendNotification({
      userId,
      type: 'SMS',
      title: 'Wallet Reversal',
      message: `Your wallet has been credited with ${amount} NGN due to failed transaction. Transaction ID: ${transactionId}. Reason: ${reason}`,
      metadata: { transactionId, amount, reason },
    });
  }

  /**
   * Send wallet reversal processed notification (with simulated delay).
   * This is sent after the reversal has been completed.
   */
  async notifyWalletReversalProcessed(
    userId: string,
    transactionId: string,
    amount: number,
    reason: string,
  ): Promise<NotificationResult> {
    // Simulate processing delay before sending reversal confirmation
    await this.simulateReversalDelay();
    
    return this.sendNotification({
      userId,
      type: 'SMS',
      title: 'Wallet Reversal Processed',
      message: `Your wallet reversal of ${amount} NGN has been processed successfully. Transaction ID: ${transactionId}. The deducted amount has been restored to your wallet.`,
      metadata: { transactionId, amount, reason, reversalProcessed: true },
    });
  }

  /**
   * Get all notifications for a user.
   */
  async getNotificationsByUserId(userId: string): Promise<NotificationRecord[]> {
    return this.notificationStore
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all notifications (for testing/debugging).
   */
  async getAllNotifications(): Promise<NotificationRecord[]> {
    return [...this.notificationStore].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get notification log (for testing).
   */
  async getNotificationLog(): Promise<NotificationRecord[]> {
    return this.getAllNotifications();
  }

  /**
   * Clear notification log (for testing).
   */
  async clearLog(): Promise<void> {
    this.notificationStore = [];
  }

  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  private async simulateReversalDelay(): Promise<void> {
    // Simulate a longer delay for reversal processing (e.g., 300ms)
    return new Promise(resolve => setTimeout(resolve, 300));
  }
}
