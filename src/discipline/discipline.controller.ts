import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DisciplineService } from './discipline.service';

@Controller('discipline')
@UseGuards(AuthGuard('jwt'))
export class DisciplineController {
  constructor(private disciplineService: DisciplineService) {}

  @Get('check')
  async checkJournalRequired(@Request() req: any) {
    return this.disciplineService.checkJournalRequired(req.user.id);
  }

  @Post('journal')
  async submitJournal(@Body() body: { reason: string }, @Request() req: any) {
    return this.disciplineService.submitJournal(req.user.id, body.reason);
  }

  @Get('journal/history')
  async getJournalHistory(@Request() req: any) {
    return this.disciplineService.getJournalHistory(req.user.id);
  }
 
  
}
