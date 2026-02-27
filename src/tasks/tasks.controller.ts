import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, FilterTasksDto } from './dto/tasks.dto';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('habitId') habitId?: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findAll(req.user.id, { habitId, milestoneId });
  }

  @Get('today')
  async findToday(@Request() req: any) {
    return this.tasksService.findToday(req.user.id);
  }

  @Get('completed')
  async findCompleted(@Request() req: any) {
    return this.tasksService.findCompleted(req.user.id);
  }

  @Get('pending')
  async findPending(@Request() req: any) {
    return this.tasksService.findPending(req.user.id);
  }

  @Get('overdue')
  async findOverdue(@Request() req: any) {
    return this.tasksService.findOverdue(req.user.id);
  }

  @Get('future')
  async findFuture(@Request() req: any) {
    return this.tasksService.findFuture(req.user.id);
  }

  @Get('filtered')
  async findFiltered(@Request() req: any, @Query() filterDto: FilterTasksDto) {
    return this.tasksService.findFiltered(req.user.id, filterDto);
  }

  @Get('habit/:habitId')
  async findByHabit(@Param('habitId') habitId: string, @Request() req: any) {
    return this.tasksService.findAll(req.user.id, { habitId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(req.user.id, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req: any) {
    return this.tasksService.update(id, req.user.id, dto);
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.complete(id, req.user.id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    return this.tasksService.updateStatus(id, req.user.id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.delete(id, req.user.id);
  }
}
