import { Module } from '@nestjs/common';
import { OAuthModule } from './oauth/oauth.module';
import { GmailModule } from './gmail/gmail.module';
import { AndroidNotificationsModule } from './android-notifications/android-notifications.module';
import { AIModule } from './ai/ai.module';
import { PromptsModule } from './ai/prompts/prompts.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { TeamsService } from './providers/teams.service';
import { CalendarService } from './providers/calendar.service';
import { OutlookService } from './providers/outlook.service';
import { OAuthExtensionService } from './providers/oauth-extension.service';
import { EventSyncEngine } from './providers/event-sync.engine';
import { ProviderPermissionService } from './providers/permission.service';
import { TeamsAdapter } from './adapters/teams.adapter';
import { CalendarAdapter } from './adapters/calendar.adapter';
import { OutlookAdapter } from './adapters/outlook.adapter';
import { ProviderNotificationService } from './adapters/provider-notification.service';
import { SyncStatusService } from './adapters/sync-status.service';
import { ProvidersController } from './providers.controller';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    OAuthModule,
    GmailModule,
    AndroidNotificationsModule,
    AIModule,
    PromptsModule,
    IntelligenceModule,
  ],
  providers: [
    TeamsService,
    CalendarService,
    OutlookService,
    OAuthExtensionService,
    EventSyncEngine,
    ProviderPermissionService,
    TeamsAdapter,
    CalendarAdapter,
    OutlookAdapter,
    ProviderNotificationService,
    SyncStatusService,
    ConfigService,
    PrismaService,
  ],
  controllers: [ProvidersController],
  exports: [
    OAuthModule,
    GmailModule,
    AndroidNotificationsModule,
    AIModule,
    PromptsModule,
    IntelligenceModule,
    TeamsService,
    CalendarService,
    OutlookService,
    OAuthExtensionService,
    EventSyncEngine,
    ProviderPermissionService,
  ],
})
export class IntegrationsModule {}
