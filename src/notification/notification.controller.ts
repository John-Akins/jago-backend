import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get notifications for the current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a list of notifications for the authenticated user, ordered by creation time (most recent first)' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationService.getNotificationsByUserId(userId);
  }
}