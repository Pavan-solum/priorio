import { Injectable } from '@nestjs/common'
import type { AuditLog } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface AuditLogData {
  workspaceId: string
  userId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DUPLICATE'
  entityType: 'TASK' | 'REMINDER' | 'TASK_SUBTASK'
  entityId: string
  changes?: Record<string, { old: any; new: any }>
  metadata?: Record<string, any>
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        id: data.entityId,
        changes: data.changes as any,
        metadata: data.metadata as any,
      },
    })
  }

  async findByEntity(workspaceId: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { workspaceId, id: entityId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByUser(workspaceId: string, userId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { workspaceId, userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async findByAction(workspaceId: string, action: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { workspaceId, action },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }
}
