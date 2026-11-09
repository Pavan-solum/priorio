import { Injectable } from '@nestjs/common'
import type { AuditLog } from '../../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'

export interface AuditLogData {
  workspaceId: string
  userId: string
  action: string
  entityType?: string
  entityId?: string
  resourceType?: string
  resourceId?: string
  changes?: Record<string, { old: any; new: any }>
  metadata?: Record<string, any>
  details?: Record<string, any>
  status?: string
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: data.workspaceId,
        actorId: data.userId,
        action: data.action,
        objectType: data.entityType || data.resourceType || 'GENERAL',
        objectId: data.entityId || data.resourceId || null,
        metadata: {
          changes: data.changes,
          details: data.details,
          status: data.status,
          ...data.metadata,
        } as any,
      },
    })
  }

  async findByEntity(workspaceId: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { workspaceId, objectId: entityId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByUser(workspaceId: string, userId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { workspaceId, actorId: userId },
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
