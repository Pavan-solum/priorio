import { Controller, Get, Post, Body, Param, Put, Delete, Query, HttpCode } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { QueryTasksDto } from './dto/query-tasks.dto'
import { Task } from './entities/task.entity'

@Controller('api/v1/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    // TODO: Get workspaceId and userId from request context/auth
    const workspaceId = 'default-workspace'
    const userId = 'default-user'
    return this.tasksService.create(workspaceId, userId, createTaskDto)
  }

  @Get()
  async findAll(@Query() query: QueryTasksDto): Promise<Task[]> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.tasksService.findAll(workspaceId, query)
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Task> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.tasksService.findOne(workspaceId, id)
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto): Promise<Task> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.tasksService.update(workspaceId, id, updateTaskDto)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    // TODO: Get workspaceId from request context/auth
    const workspaceId = 'default-workspace'
    return this.tasksService.remove(workspaceId, id)
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string): Promise<Task> {
    // TODO: Get workspaceId and userId from request context/auth
    const workspaceId = 'default-workspace'
    const userId = 'default-user'
    return this.tasksService.duplicate(workspaceId, userId, id)
  }
}
