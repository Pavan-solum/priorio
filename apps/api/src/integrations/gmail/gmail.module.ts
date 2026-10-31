import { Module } from '@nestjs/common';
import { GmailSyncService } from './gmail-sync.service';
import { GmailController } from './gmail.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OAuthModule } from '../oauth/oauth.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { TasksModule } from '../../tasks/tasks.module';

@Module({
  imports: [PrismaModule, OAuthModule, AuditLogsModule, TasksModule],
  providers: [GmailSyncService],
  controllers: [GmailController],
  exports: [GmailSyncService],
})
export class GmailModule {}
