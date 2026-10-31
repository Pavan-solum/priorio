import { Module } from '@nestjs/common';
import { OAuthModule } from './oauth/oauth.module';
import { GmailModule } from './gmail/gmail.module';
import { AndroidNotificationsModule } from './android-notifications/android-notifications.module';

@Module({
  imports: [OAuthModule, GmailModule, AndroidNotificationsModule],
  exports: [OAuthModule, GmailModule, AndroidNotificationsModule],
})
export class IntegrationsModule {}
