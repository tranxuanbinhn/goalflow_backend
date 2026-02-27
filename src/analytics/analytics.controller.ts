import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  async getOverview(@Request() req: any, @Query('visionId') visionId?: string) {
    return this.analyticsService.getOverview(req.user.id, visionId);
  }

  @Get('daily')
  async getDailyReport(@Request() req: any, @Query('date') date?: string) {
    return this.analyticsService.getDailyReport(req.user.id, date);
  }

  @Get('weekly')
  async getWeeklyReport(@Request() req: any) {
    return this.analyticsService.getWeeklyReport(req.user.id);
  }

  @Get('monthly')
  async getMonthlyReport(
    @Request() req: any,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.analyticsService.getMonthlyReport(req.user.id, year, month);
  }

  @Get('streaks')
  async getStreaks(@Request() req: any) {
    return this.analyticsService.getStreaks(req.user.id);
  }
}
