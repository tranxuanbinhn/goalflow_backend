import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VisionsService } from './visions.service';
import { VisionsController } from './visions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VisionsController],
  providers: [VisionsService],
  exports: [VisionsService],
})
export class VisionsModule {}
