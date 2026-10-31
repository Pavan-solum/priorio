import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateReminderDto } from './dto/create-reminder.dto'
import { UpdateReminderDto } from './dto/update-reminder.dto'
import { Reminder } from './entities/reminder.entity'

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateReminderDto): Promise<Reminder> {
    return this.prisma.reminder.create({
      data: {
        workspaceId,
        title: dto.title,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        timezone: dto.timezone,
        recurrence: dto.recurrence,
      },
    })
  }

  async findAll(workspaceId: string): Promise<Reminder[]> {
    return this.prisma.reminder.findMany({
      where: { workspaceId },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async findOne(workspaceId: string, reminderId: string): Promise<Reminder> {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
    })

    if (!reminder || reminder.workspaceId !== workspaceId) {
      throw new NotFoundException(`Reminder ${reminderId} not found`)
    }

    return reminder
  }

  async update(workspaceId: string, reminderId: string, dto: UpdateReminderDto): Promise<Reminder> {
    await this.findOne(workspaceId, reminderId)

    return this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        title: dto.title,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        timezone: dto.timezone,
        recurrence: dto.recurrence,
      },
    })
  }

  async remove(workspaceId: string, reminderId: string): Promise<void> {
    await this.findOne(workspaceId, reminderId)
    await this.prisma.reminder.delete({ where: { id: reminderId } })
  }

  async complete(workspaceId: string, reminderId: string): Promise<Reminder> {
    await this.findOne(workspaceId, reminderId)

    return this.prisma.reminder.update({
      where: { id: reminderId },
      data: { completedAt: new Date() },
    })
  }

  async getUpcoming(workspaceId: string, hours: number = 24): Promise<Reminder[]> {
    const now = new Date()
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000)

    return this.prisma.reminder.findMany({
      where: {
        workspaceId,
        completedAt: null,
        scheduledAt: { gte: now, lte: future },
      },
      orderBy: { scheduledAt: 'asc' },
    })
  }
}
