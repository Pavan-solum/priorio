import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogsService } from '../audit-logs/audit-logs.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { QueryTasksDto } from './dto/query-tasks.dto'
import { Task } from './entities/task.entity'

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateTaskDto): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        workspaceId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        timezone: dto.timezone,
        priority: dto.priority || 'MEDIUM',
        status: dto.status || 'PENDING',
      },
    })

    await this.auditLogs.log({
      workspaceId,
      userId,
      action: 'CREATE',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { title: task.title, priority: task.priority },
    })

    return task
  }

  async findAll(workspaceId: string, query: QueryTasksDto): Promise<Task[]> {
    const where: any = { workspaceId }

    if (query.status) {
      where.status = query.status
    }

    if (query.priority) {
      where.priority = query.priority
    }

    if (query.dueBefore || query.dueAfter) {
      where.dueAt = {}
      if (query.dueBefore) {
        where.dueAt.lte = new Date(query.dueBefore)
      }
      if (query.dueAfter) {
        where.dueAt.gte = new Date(query.dueAfter)
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async findOne(workspaceId: string, taskId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.workspaceId !== workspaceId) {
      throw new NotFoundException(`Task ${taskId} not found`)
    }

    return task
  }

  async update(workspaceId: string, taskId: string, dto: UpdateTaskDto): Promise<Task> {
    const original = await this.findOne(workspaceId, taskId)

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        timezone: dto.timezone,
        priority: dto.priority,
        status: dto.status,
        completedAt: dto.status === 'COMPLETED' ? new Date() : undefined,
      },
    })

    const changes: any = {}
    if (dto.title && dto.title !== original.title) {
      changes.title = { old: original.title, new: dto.title }
    }
    if (dto.status && dto.status !== original.status) {
      changes.status = { old: original.status, new: dto.status }
    }

    if (Object.keys(changes).length > 0) {
      await this.auditLogs.log({
        workspaceId,
        userId: 'system',
        action: 'UPDATE',
        entityType: 'TASK',
        entityId: taskId,
        changes,
      })
    }

    return updated
  }

  async remove(workspaceId: string, taskId: string): Promise<void> {
    const task = await this.findOne(workspaceId, taskId)

    await this.prisma.task.delete({ where: { id: taskId } })

    await this.auditLogs.log({
      workspaceId,
      userId: 'system',
      action: 'DELETE',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { title: task.title },
    })
  }

  async duplicate(workspaceId: string, userId: string, taskId: string): Promise<Task> {
    const original = await this.findOne(workspaceId, taskId)

    const task = await this.prisma.task.create({
      data: {
        workspaceId,
        createdById: userId,
        title: `${original.title} (copy)`,
        description: original.description,
        dueAt: original.dueAt,
        timezone: original.timezone,
        priority: original.priority,
        status: 'PENDING',
      },
    })

    await this.auditLogs.log({
      workspaceId,
      userId,
      action: 'DUPLICATE',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { sourceTaskId: taskId },
    })

    return task
  }
}
