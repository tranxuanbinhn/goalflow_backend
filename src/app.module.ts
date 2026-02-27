import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GoalsModule } from './goals/goals.module';
import { TasksModule } from './tasks/tasks.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DisciplineModule } from './discipline/discipline.module';

@Module({
  imports: [
    // Config module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Prisma database module
    PrismaModule,
    
    // Feature modules
    AuthModule,
    UsersModule,
    GoalsModule,
TasksModule,
    AnalyticsModule,
    DisciplineModule,
  ],
})
export class AppModule {}
