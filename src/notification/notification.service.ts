import { Injectable } from '@nestjs/common';
import { MockNotificationService, NotificationRecord } from '../external/mock-notification.service';

@Injectable()
export class NotificationService {
  constructor(private readonly mockNotificationService: MockNotificationService) {}

  /**
   * Get all notifications for a user, ordered by creation time (most recent first).
   */
  async getNotificationsByUserId(userId: string): Promise<NotificationRecord[]> {
    return this.mockNotificationService.getNotificationsByUserId(userId);
  }
}