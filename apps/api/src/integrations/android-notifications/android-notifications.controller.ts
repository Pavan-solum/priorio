import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { AndroidNotificationsService } from './android-notifications.service';

@Controller('api/integrations/android')
export class AndroidNotificationsController {
  constructor(private androidService: AndroidNotificationsService) {}

  /**
   * Register Android device
   * POST /api/integrations/android/register
   */
  @Post('register')
  async registerDevice(
    @Body() dto: { deviceId: string; deviceName: string; fcmToken?: string },
    @Request() req: any,
  ): Promise<{ id: string; status: string }> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    const userId = req.userId || '00000000-0000-0000-0000-000000000001';
    return this.androidService.registerDevice(workspaceId, userId, dto);
  }

  /**
   * Capture notification
   * POST /api/integrations/android/notifications
   */
  @Post('notifications')
  async captureNotification(
    @Body() dto: { title: string; body: string; appPackage: string; timestamp?: Date },
    @Request() req: any,
  ): Promise<{ taskId?: string; notificationId: string; status: string }> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    const userId = req.userId || '00000000-0000-0000-0000-000000000001';
    return this.androidService.captureNotification(workspaceId, userId, {
      ...dto,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
    });
  }

  /**
   * Get notifications
   * GET /api/integrations/android/notifications?dismissed=false
   */
  @Get('notifications')
  async getNotifications(
    @Request() req: any,
    @Query('dismissed') dismissed?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    const userId = req.userId || '00000000-0000-0000-0000-000000000001';
    return this.androidService.getNotifications(workspaceId, userId, {
      dismissed: dismissed === 'true',
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Dismiss notification
   * DELETE /api/integrations/android/notifications/:id
   */
  @Delete('notifications/:id')
  async dismissNotification(
    @Param('id') notificationId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    return this.androidService.dismissNotification(workspaceId, notificationId);
  }

  /**
   * Set permission preferences
   * POST /api/integrations/android/permissions
   */
  @Post('permissions')
  async setPermissions(
    @Body() dto: { allowedApps?: string[]; disallowedApps?: string[]; autoCreateTasks?: boolean },
    @Request() req: any,
  ): Promise<{ message: string }> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    const userId = req.userId || '00000000-0000-0000-0000-000000000001';
    return this.androidService.setPermissionPreferences(workspaceId, userId, dto);
  }
}
