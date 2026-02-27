import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestones.dto';

@Controller('goals/milestones')
@UseGuards(AuthGuard('jwt'))
export class MilestonesController {
  constructor(private milestonesService: MilestonesService) {}

  @Get()
  async findAll(@Query('visionId') visionId?: string, @Request() req?: any) {
    return this.milestonesService.findAll(visionId, req?.user?.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.milestonesService.findOne(id, req.user.id);
  }

  // Lấy progress (0-100) cho một Milestone
  @Get(':id/progress')
  async getProgress(@Param('id') id: string, @Request() req: any) {
    // Đảm bảo milestone thuộc về user hiện tại
    await this.milestonesService.findOne(id, req.user.id);
    const progress = await this.milestonesService.calculateMilestoneProgress(id);
    return { milestoneId: id, progress };
  }

  @Post()
  async create(@Body() dto: CreateMilestoneDto & { visionId: string }, @Request() req: any) {
    return this.milestonesService.create(dto.visionId, dto, req.user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto, @Request() req: any) {
    return this.milestonesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.milestonesService.delete(id, req.user.id);
  }
}
