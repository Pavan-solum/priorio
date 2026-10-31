import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { GmailSyncService } from './gmail-sync.service';
import { TriggerGmailSyncDto } from './dto/gmail.dto';

@Controller('api/integrations/gmail')
export class GmailController {
  constructor(private gmailService: GmailSyncService) {}

  /**
   * Trigger Gmail sync
   * POST /api/integrations/gmail/sync
   */
  @Post('sync')
  async triggerSync(
    @Body() dto: TriggerGmailSyncDto,
    @Request() req: any,
  ): Promise<{ syncId: string }> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    return this.gmailService.initiateSync(dto.connectionId, workspaceId);
  }

  /**
   * Get sync status
   * GET /api/integrations/gmail/sync/:syncId
   */
  @Get('sync/:syncId')
  async getSyncStatus(@Param('syncId') syncId: string): Promise<any> {
    return this.gmailService.getSyncStatus(syncId);
  }

  /**
   * Get sync history
   * GET /api/integrations/gmail/sync-history
   */
  @Get('sync-history')
  async getSyncHistory(@Request() req: any): Promise<any[]> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    return this.gmailService.getSyncHistory(workspaceId);
  }
}
