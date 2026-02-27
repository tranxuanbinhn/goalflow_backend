import { Module } from '@nestjs/common';
import { VisionsModule } from './visions/visions.module';
import { MilestonesModule } from './milestones/milestones.module';
import { HabitsModule } from './habits/habits.module';

@Module({
  imports: [VisionsModule, MilestonesModule, HabitsModule],
  exports: [VisionsModule, MilestonesModule, HabitsModule],
})
export class GoalsModule {}
