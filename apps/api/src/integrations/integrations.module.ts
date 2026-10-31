import { Module } from '@nestjs/common';
import { OAuthModule } from './oauth/oauth.module';
import { GmailModule } from './gmail/gmail.module';
import { AndroidNotificationsModule } from './android-notifications/android-notifications.module';
import { AIModule } from './ai/ai.module';
import { PromptsModule } from './ai/prompts/prompts.module';

@Module({
  imports: [OAuthModule, GmailModule, AndroidNotificationsModule, AIModule, PromptsModule],
  exports: [OAuthModule, GmailModule, AndroidNotificationsModule, AIModule, PromptsModule],
})
export class IntegrationsModule {}
