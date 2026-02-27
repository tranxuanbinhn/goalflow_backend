import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserSettingsDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { settings: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto) {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: dto,
      create: { ...dto, userId },
    });

    return settings;
  }

  async getSettings(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Return defaults if no settings exist
      return {
        dailyGoal: 5,
        pomodoroWork: 25,
        pomodoroBreak: 5,
        soundEnabled: true,
        theme: 'dark',
      };
    }

    return settings;
  }
}
