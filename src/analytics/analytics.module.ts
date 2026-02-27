import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VisionsModule } from '../goals/visions/visions.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [PrismaModule, VisionsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
