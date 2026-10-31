import { Module } from '@nestjs/common';
import { AndroidNotificationsService } from './android-notifications.service';
import { AndroidNotificationsController } from './android-notifications.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { TasksModule } from '../../tasks/tasks.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, TasksModule, AuditLogsModule],
  providers: [AndroidNotificationsService],
  controllers: [AndroidNotificationsController],
  exports: [AndroidNotificationsService],
})
export class AndroidNotificationsModule {}
