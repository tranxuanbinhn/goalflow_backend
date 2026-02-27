import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HabitsService } from './habits.service';
import { CreateHabitDto, UpdateHabitDto } from './dto/habits.dto';

@Controller('goals/habits')
@UseGuards(AuthGuard('jwt'))
export class HabitsController {
  constructor(private habitsService: HabitsService) {}

  @Get()
  async findAll(@Query('milestoneId') milestoneId?: string, @Request() req?: any) {
    return this.habitsService.findAll(milestoneId, req?.user?.id);
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    const userId = req.user.id;
    const [bestStreak, completedToday, totalActive] = await Promise.all([
      this.habitsService.getBestStreak(userId),
      this.habitsService.getCompletedTodayCount(userId),
      this.habitsService.getTotalActiveHabits(userId),
    ]);
    return {
      bestStreak,
      completedToday,
      totalActive,
    };
  }
  @Get('habitss/:id')
  async getStreak(@Param('id') id: string) {
    const result = await this.habitsService.calculateStreakByFrequency(id);
    return { streak: result };
  }

  // Endpoint admin tạm thời để resync streak của một habit từ HabitActivity
  @Post(':id/resync-streak')
  async resyncHabitStreak(@Param('id') id: string) {
    const newStreak = await this.habitsService.resyncHabitStreak(id);
    return { habitId: id, streak: newStreak };
  }

  // Endpoint admin tạm thời để resync streak cho toàn bộ habits
  @Post('admin/resync-all-streaks')
  async resyncAllHabitsStreak() {
    await this.habitsService.resyncAllHabitsStreak();
    return { status: 'ok' };
  }

  @Get('activity/:id')
  async getActivity(
    @Param('id') id: string,
    @Query('days') days: string,
    @Request() req: any
  ) {
    const daysNum = days ? parseInt(days) : 30;
    return this.habitsService.getHabitActivity(id, daysNum, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.habitsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Body() dto: CreateHabitDto, @Request() req: any) {
    return this.habitsService.create(dto, req.user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHabitDto, @Request() req: any) {
    return this.habitsService.update(id, req.user.id, dto);
  }

  @Put(':id/toggle')
  async toggle(@Param('id') id: string, @Request() req: any) {
    return this.habitsService.toggleActive(id, req.user.id);
  }

  @Put(':id/complete')
  async toggleComplete(@Param('id') id: string, @Request() req: any) {
    return this.habitsService.toggleCompletedToday(id, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.habitsService.delete(id, req.user.id);
  }
}
