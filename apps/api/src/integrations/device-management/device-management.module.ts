import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DeviceService } from './device.service';
import { SyncService } from './sync.service';
import { OfflineTaskService } from './offline-task.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { DeviceManagementController } from './device-management.controller';

@Module({
  imports: [PrismaModule],
  providers: [DeviceService, SyncService, OfflineTaskService, ConflictResolutionService],
  controllers: [DeviceManagementController],
  exports: [DeviceService, SyncService, OfflineTaskService, ConflictResolutionService],
})
export class DeviceManagementModule {}
