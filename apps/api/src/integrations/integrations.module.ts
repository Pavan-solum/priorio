import { Module } from '@nestjs/common';
import { OAuthModule } from './oauth/oauth.module';
import { GmailModule } from './gmail/gmail.module';
import { AndroidNotificationsModule } from './android-notifications/android-notifications.module';
import { AIModule } from './ai/ai.module';

@Module({
  imports: [OAuthModule, GmailModule, AndroidNotificationsModule, AIModule],
  exports: [OAuthModule, GmailModule, AndroidNotificationsModule, AIModule],
})
export class IntegrationsModule {}
