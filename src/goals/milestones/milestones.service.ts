import { Injectable, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestones.dto';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper method to find or create an icon by emoji
   * Uses 'name' as the unique field in the Icon model
   */
  private async findOrCreateIcon(emoji: string): Promise<string | null> {
    if (!emoji) return null;
    
    // Try to find existing icon by name (which is unique)
    const icon = await this.prisma.icon.findUnique({
      where: { name: emoji },
    });
    
    if (icon) {
      return icon.id;
    }
    
    // Create new icon if not found
    const newIcon = await this.prisma.icon.create({
      data: {
        name: emoji,
        emoji,
        category: 'custom',
      },
    });
    
    return newIcon.id;
  }

  /**
   * Transform milestone to include icon as emoji string instead of icon object
   */
  private transformMilestone(milestone: any) {
    if (!milestone) return milestone;
    return {
      ...milestone,
      icon: milestone.icon?.emoji || null,
    };
  }

  /**
   * Transform milestones array to include icon as emoji string
   */
  private transformMilestones(milestones: any[]) {
    return milestones.map(milestone => this.transformMilestone(milestone));
  }

  async findAll(visionId?: string, userId?: string) {
    const where: any = {};
    
    if (visionId) {
      where.visionId = visionId;
    }
    
    if (userId) {
      where.vision = { userId };
    }

    const milestones = await this.prisma.milestone.findMany({
      where,
      include: {
        habits: {
          include: {
            tasks: true,
          },
        },
        tasks: true, // Include directly linked tasks
        vision: true,
        icon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return this.transformMilestones(milestones);
  }

  async findOne(id: string, userId: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id, vision: { userId } },
      include: {
        habits: {
          include: {
            tasks: true,
            activities: true,
          },
        },
        tasks: true, // Include directly linked tasks
        vision: true,
        icon: true,
      },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    return this.transformMilestone(milestone);
  }

  /**
   * Tính progress cho một Milestone dựa trên vòng đời Milestone (createdAt → targetDate).
   * - Với mỗi Habit trong Milestone:
   *   habitTarget = totalDays * (frequencyPerWeek / 7)
   * - grandTotalTarget = tổng habitTarget của tất cả habits
   * - totalActual = tổng số HabitActivity.completed = true của tất cả habits
   * - Progress = (totalActual / grandTotalTarget) * 100, clamp 0–100, Math.round
   */
  async calculateMilestoneProgress(milestoneId: string): Promise<number> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        habits: {
          include: {
            activities: {
              where: { completed: true },
            },
          },
        },
      },
    });

    if (
      !milestone ||
      !milestone.habits ||
      milestone.habits.length === 0 ||
      !milestone.targetDate
    ) {
      return 0;
    }

    const start = dayjs(milestone.createdAt).startOf('day');
    const end = dayjs(milestone.targetDate).startOf('day');
    const totalDays = end.diff(start, 'day') + 1;

    if (totalDays <= 0) {
      return 0;
    }

    let grandTotalTarget = 0;
    let totalActual = 0;

    for (const habit of milestone.habits) {
      const frequencyPerWeek = habit.frequencyPerWeek || 0;
      if (frequencyPerWeek <= 0) continue;

      const habitTarget = (frequencyPerWeek / 7) * totalDays;
      grandTotalTarget += habitTarget;

      totalActual += (habit.activities || []).length;
    }

    if (grandTotalTarget <= 0) {
      return 0;
    }

    const progress = (totalActual / grandTotalTarget) * 100;
    return Math.min(Math.round(progress), 100);
  }

  async create(visionId: string, dto: CreateMilestoneDto, userId: string) {
    const vision = await this.prisma.vision.findFirst({
      where: { id: visionId, userId },
    });

    if (!vision) {
      throw new NotFoundException('Vision not found');
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
      visionId,
    };
    
    if (dto.targetDate) {
      data.targetDate = new Date(dto.targetDate);
    }

    // Handle icon - convert emoji to iconId
    if (dto.icon) {
      data.iconId = await this.findOrCreateIcon(dto.icon);
    }

    const milestone = await this.prisma.milestone.create({
      data,
      include: {
        habits: true,
        icon: true,
      },
    });
    
    return this.transformMilestone(milestone);
  }

  async update(id: string, userId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id, vision: { userId } },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
      status: (dto.status as any),
    };
    
    if (dto.targetDate) {
      data.targetDate = new Date(dto.targetDate);
    }

    // Handle icon - convert emoji to iconId
    if (dto.icon !== undefined) {
      data.iconId = dto.icon ? await this.findOrCreateIcon(dto.icon) : null;
    }

    const updatedMilestone = await this.prisma.milestone.update({
      where: { id },
      data,
      include: {
        habits: true,
        icon: true,
      },
    });
    
    return this.transformMilestone(updatedMilestone);
  }

  async updateStatus(id: string, userId: string, status: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id, vision: { userId } },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    return this.prisma.milestone.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async delete(id: string, userId: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id, vision: { userId } },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // Cascade delete: Delete all tasks associated with this milestone
    // First, get all tasks linked directly to this milestone
    const directTasks = await this.prisma.task.findMany({
      where: { milestoneId: id },
    });
    
    // Delete directly linked tasks
    if (directTasks.length > 0) {
      await this.prisma.task.deleteMany({
        where: { milestoneId: id },
      });
    }

    // Get all habits linked to this milestone to delete their tasks
    const habits = await this.prisma.habit.findMany({
      where: { milestoneId: id },
      include: { tasks: true },
    });

    // Delete tasks linked to habits of this milestone
    for (const habit of habits) {
      if (habit.tasks && habit.tasks.length > 0) {
        await this.prisma.task.deleteMany({
          where: { habitId: habit.id },
        });
      }
    }

    // Delete habits associated with this milestone
    await this.prisma.habit.deleteMany({
      where: { milestoneId: id },
    });

    // Finally, delete the milestone itself
    return this.prisma.milestone.delete({
      where: { id },
    });
  }
}
