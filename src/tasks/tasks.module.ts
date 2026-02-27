import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { HabitsModule } from '../goals/habits/habits.module';

@Module({
  imports: [PrismaModule, HabitsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
