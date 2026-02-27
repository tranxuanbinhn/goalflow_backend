import { Injectable, NotFoundException } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVisionDto, UpdateVisionDto } from './dto/visions.dto';

@Injectable()
export class VisionsService {
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
   * Tính progress milestone từ dữ liệu milestone (đã include habits.activities)
   * Dựa trên vòng đời milestone: createdAt → targetDate.
   */
  private calculateMilestoneProgressFromData(milestone: any): number {
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

      totalActual += (habit.activities || []).filter((a: any) => a.completed).length;
    }

    if (grandTotalTarget <= 0) {
      return 0;
    }

    const progress = (totalActual / grandTotalTarget) * 100;
    return Math.min(Math.round(progress), 100);
  }

  /**
   * Tính progress cho một Vision dựa trên trung bình progress của các Milestone con.
   * Vision Progress = average(milestone.progress) (0–100, làm tròn và clamp).
   */
  public calculateVisionProgressFromData(vision: any): number {
    if (!vision || !vision.milestones || vision.milestones.length === 0) {
      return 0;
    }

    const milestoneProgresses = vision.milestones.map((m: any) =>
      this.calculateMilestoneProgressFromData(m),
    );

    const sum = milestoneProgresses.reduce((acc: number, v: number) => acc + v, 0);
    const avg = sum / vision.milestones.length;

    const rounded = Math.round(avg);
    return Math.max(0, Math.min(100, rounded));
  }

  /**
   * Transform milestone to include icon as emoji string và progress (%)
   */
  private transformMilestone(milestone: any) {
    if (!milestone) return milestone;
    return {
      ...milestone,
      icon: milestone.icon?.emoji || null,
      progress: this.calculateMilestoneProgressFromData(milestone),
    };
  }

  /**
   * Transform vision to include icon as emoji string instead of icon object
   * Also transforms nested milestones và tính luôn progress cho Vision.
   */
  private transformVision(vision: any) {
    if (!vision) return vision;

    const milestonesWithProgress =
      vision.milestones?.map((m: any) => this.transformMilestone(m)) || [];

    return {
      ...vision,
      icon: vision.icon?.emoji || null,
      milestones: milestonesWithProgress,
      progress: this.calculateVisionProgressFromData({
        ...vision,
        milestones: milestonesWithProgress,
      }),
    };
  }

  /**
   * Transform visions array to include icon as emoji string
   */
  private transformVisions(visions: any[]) {
    return visions.map(vision => this.transformVision(vision));
  }

  async findAll(userId: string) {
    const visions = await this.prisma.vision.findMany({
      where: { userId },
      include: {
        milestones: {
          include: {
            habits: {
              include: {
                activities: true,
              },
            },
            tasks: true, // Include directly linked tasks
            icon: true,
          },
        },
        icon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return this.transformVisions(visions);
  }

  async findOne(id: string, userId: string) {
    const vision = await this.prisma.vision.findFirst({
      where: { id, userId },
      include: {
        milestones: {
          include: {
            habits: {
              include: {
                tasks: true,
                activities: true,
              },
            },
            icon: true,
          },
        },
        icon: true,
      },
    });

    if (!vision) {
      throw new NotFoundException('Vision not found');
    }

    return this.transformVision(vision);
  }

  async create(userId: string, dto: CreateVisionDto) {
    const data: any = {
      title: dto.title,
      description: dto.description,
      userId,
    };
    
    if (dto.targetDate) {
      data.targetDate = new Date(dto.targetDate);
    }

    if (dto.icon) {
      data.iconId = await this.findOrCreateIcon(dto.icon);
    }

    const vision = await this.prisma.vision.create({
      data,
      include: {
        milestones: {
          include: {
            habits: {
              include: {
                activities: true,
              },
            },
            icon: true,
          },
        },
        icon: true,
      },
    });
    
    return this.transformVision(vision);
  }

  async update(id: string, userId: string, dto: UpdateVisionDto) {
    const vision = await this.prisma.vision.findFirst({
      where: { id, userId },
    });

    if (!vision) {
      throw new NotFoundException('Vision not found');
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
    };
    
    if (dto.targetDate) {
      data.targetDate = new Date(dto.targetDate);
    }

    if (dto.icon !== undefined) {
      data.iconId = dto.icon ? await this.findOrCreateIcon(dto.icon) : null;
    }

    const updatedVision = await this.prisma.vision.update({
      where: { id },
      data,
      include: {
        milestones: {
          include: {
            habits: {
              include: {
                activities: true,
              },
            },
            icon: true,
          },
        },
        icon: true,
      },
    });
    
    return this.transformVision(updatedVision);
  }

  async delete(id: string, userId: string) {
    const vision = await this.prisma.vision.findFirst({
      where: { id, userId },
    });

    if (!vision) {
      throw new NotFoundException('Vision not found');
    }

    // Get count of related data before deletion for reporting
    const milestones = await this.prisma.milestone.findMany({
      where: { visionId: id },
      include: {
        habits: true,
        tasks: true,
      },
    });

    const totalMilestones = milestones.length;
    const totalHabits = milestones.reduce((sum, m) => sum + m.habits.length, 0);
    const totalTasks = milestones.reduce((sum, m) => sum + m.tasks.length, 0);

    // Perform cascade deletion (Prisma handles this via schema)
    await this.prisma.vision.delete({
      where: { id },
    });

    return {
      id,
      title: vision.title,
      deletedMilestones: totalMilestones,
      deletedHabits: totalHabits,
      deletedTasks: totalTasks,
    };
  }
}
