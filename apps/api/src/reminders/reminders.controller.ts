import { Controller, Get, Post, Body, Param, Put, Delete, HttpCode, Query } from '@nestjs/common'
import { RemindersService } from './reminders.service'
import { CreateReminderDto } from './dto/create-reminder.dto'
import { UpdateReminderDto } from './dto/update-reminder.dto'
import { Reminder } from './entities/reminder.entity'

@Controller('api/v1/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  async create(@Body() createReminderDto: CreateReminderDto): Promise<Reminder> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.remindersService.create(workspaceId, createReminderDto)
  }

  @Get()
  async findAll(): Promise<Reminder[]> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.remindersService.findAll(workspaceId)
  }

  @Get('upcoming')
  async getUpcoming(@Query('hours') hours: string = '24'): Promise<Reminder[]> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.remindersService.getUpcoming(workspaceId, parseInt(hours, 10))
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Reminder> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.remindersService.findOne(workspaceId, id)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateReminderDto: UpdateReminderDto,
  ): Promise<Reminder> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.remindersService.update(workspaceId, id, updateReminderDto)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.remindersService.remove(workspaceId, id)
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string): Promise<Reminder> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.remindersService.complete(workspaceId, id)
  }
}
