import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VisionsService } from './visions.service';
import { CreateVisionDto, UpdateVisionDto } from './dto/visions.dto';

@Controller('goals/visions')
@UseGuards(AuthGuard('jwt'))
export class VisionsController {
  constructor(private visionsService: VisionsService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.visionsService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.visionsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Body() dto: CreateVisionDto, @Request() req: any) {
    return this.visionsService.create(req.user.id, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVisionDto, @Request() req: any) {
    return this.visionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.visionsService.delete(id, req.user.id);
  }
}
