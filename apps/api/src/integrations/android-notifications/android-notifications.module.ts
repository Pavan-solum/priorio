import { Module } from '@nestjs/common';
import { AndroidNotificationsService } from './android-notifications.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AndroidNotificationsService],
  exports: [AndroidNotificationsService],
})
export class AndroidNotificationsModule {}
