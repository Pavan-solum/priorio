import { Module } from '@nestjs/common';
import { OAuthModule } from './oauth/oauth.module';
import { GmailModule } from './gmail/gmail.module';
import { AndroidNotificationsModule } from './android-notifications/android-notifications.module';
import { AIModule } from './ai/ai.module';
import { PromptsModule } from './ai/prompts/prompts.module';
import { IntelligenceModule } from './intelligence/intelligence.module';

@Module({
  imports: [OAuthModule, GmailModule, AndroidNotificationsModule, AIModule, PromptsModule, IntelligenceModule],
  exports: [OAuthModule, GmailModule, AndroidNotificationsModule, AIModule, PromptsModule, IntelligenceModule],
})
export class IntegrationsModule {}
