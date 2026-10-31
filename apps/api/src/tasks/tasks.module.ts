import { Module } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { TasksController } from './tasks.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { AuditLogsModule } from '../audit-logs/audit-logs.module'

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
