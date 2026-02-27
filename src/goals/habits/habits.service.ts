import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHabitDto, UpdateHabitDto } from './dto/habits.dto';

// Gradient color options for habits
const HABIT_COLORS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-yellow-500 to-orange-500',
  'from-red-500 to-orange-500',
  'from-indigo-500 to-blue-500',
  'from-teal-500 to-green-500',
];

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  // Helper to check if date is today
  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  // Reset completedToday for all habits (should be called daily)
  private async resetCompletedToday(): Promise<void> {
    const habits = await this.prisma.habit.findMany({
      where: {
        lastCompletedAt: {
          not: null,
        },
      },
    });

    for (const habit of habits) {
      if (habit.lastCompletedAt && !this.isToday(habit.lastCompletedAt)) {
        await this.prisma.habit.update({
          where: { id: habit.id },
          data: { completedToday: false },
        });
      }
    }
  }

  async findAll(milestoneId?: string, userId?: string) {
    // Reset completedToday for habits not completed today
    await this.resetCompletedToday();

    const where: any = {};

    if (milestoneId) {
      where.milestoneId = milestoneId;
    }

    if (userId) {
      // Include both:
      // 1. Habits with milestones owned by the user (via vision.userId)
      // 2. Habits without a milestone (standalone habits with milestoneId = null)
      where.OR = [
        { milestone: { vision: { userId } } },
        { milestoneId: null },
      ];
    }

    return this.prisma.habit.findMany({
      where,
      include: {
        milestone: {
          include: {
            vision: true,
          },
        },
        tasks: {
          where: {
            OR: [
              {
                createdAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
              },
              {
                completedAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
              },
            ],
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

async findOne(id: string, userId: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { id, milestone: { vision: { userId } } },
      include: {
        milestone: {
          include: {
            vision: true,
          },
        },
        tasks: true,
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    return habit;
  }

  async create(dto: CreateHabitDto, userId: string) {
    // Generate random color if not provided
    const color = dto.color || HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];
    // Use provided icon or default to 🎯
    const icon = dto.icon || '🎯';

    // Default to 7 (every day) if not provided
    const frequencyPerWeek = dto.frequencyPerWeek ?? 7;

    return this.prisma.habit.create({
      data: {
        title: dto.title,
        description: dto.description,
        // Legacy fields - keep for backward compatibility
        frequency: 'DAILY' as any,
        frequencyTarget: 1,
        frequencyPeriod: 'DAY' as any,
        // New simplified frequency model
        frequencyPerWeek,
        reminder: dto.reminder,
        milestoneId: dto.milestoneId,
        icon,
        color,
        streak: 0,
        completedToday: false,
      } as any,
      include: {
        tasks: true,
      },
    });
  }

async update(id: string, userId: string, dto: UpdateHabitDto) {
    const habit = await this.prisma.habit.findFirst({
      where: { 
        id, 
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    // Check if frequencyPerWeek is being changed
    const isFrequencyChanged = dto.frequencyPerWeek !== undefined;

    if (isFrequencyChanged) {
      // When frequency changes, reset streak and clear activity history
      await this.prisma.habitActivity.deleteMany({
        where: { habitId: id },
      });
    }

    return this.prisma.habit.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        // Handle new frequencyPerWeek field
        ...(dto.frequencyPerWeek !== undefined
          ? {
              frequencyPerWeek: dto.frequencyPerWeek,
              // Reset legacy fields to defaults
              frequency: 'DAILY' as any,
              frequencyTarget: 1,
              frequencyPeriod: 'DAY' as any,
              streak: 0,
              completedToday: false,
              lastCompletedAt: null,
            }
          : {}),
        reminder: dto.reminder,
        isActive: dto.isActive,
        icon: dto.icon,
        color: dto.color,
        estimatedTime: dto.estimatedTime,
        milestoneId: dto.milestoneId,
      } as any,
    });
  }

  // Check if habit can be manually completed (all today's tasks must be completed)
  async canManuallyComplete(id: string, userId: string): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const habit = await this.prisma.habit.findFirst({
      where: { 
        id,
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
      },
      include: {
        tasks: {
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    // Debug logging
    console.log(`[DEBUG] canManuallyComplete - habit.id: ${id}, today's tasks count: ${habit.tasks.length}`);
    habit.tasks.forEach(task => {
      console.log(`[DEBUG] Task id: ${task.id}, status: ${task.status}`);
    });

    // If no tasks exist for today, allow manual completion
    if (habit.tasks.length === 0) {
      return true;
    }

    // Check for any incomplete tasks (PENDING, IN_PROGRESS, SKIPPED)
    const hasIncompleteTasks = habit.tasks.some(task => 
      task.status === 'PENDING' || task.status === 'IN_PROGRESS' || task.status === 'SKIPPED'
    );
    
    return !hasIncompleteTasks;
  }

  // Check if all today's tasks for a habit are completed
  async areAllTasksCompleted(habitId: string): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await this.prisma.task.findMany({
      where: {
        habitId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // If no tasks exist for today, consider as "all completed" (allows manual/habit-only completion)
    if (tasks.length === 0) {
      return true;
    }

    // All tasks must be completed
    return tasks.every(task => task.status === 'COMPLETED');
  }

  // Check and auto-complete habit if all tasks are done
  async checkAndAutoCompleteHabit(habitId: string): Promise<boolean> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      return false;
    }

    const allTasksCompleted = await this.areAllTasksCompleted(habitId);

    // Only auto-complete if not already completed today
    if (allTasksCompleted && !habit.completedToday) {
      const now = new Date();

      await this.prisma.habit.update({
        where: { id: habitId },
        data: {
          completedToday: true,
          lastCompletedAt: now,
        },
      });

      // Log activity for today
      await this.logHabitActivity(habitId, true);

      // Recalculate streak based on frequency model
      const newStreak = await this.calculateStreakByFrequency(habitId);
      
      await this.prisma.habit.update({
        where: { id: habitId },
        data: { streak: newStreak },
      });

      return true;
    }

    return false;
  }

  // Toggle habit completion for today
  async toggleCompletedToday(id: string, userId: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { 
        id,
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
      },
      include: {
        tasks: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    const isCurrentlyCompleted = habit.completedToday;
    const now = new Date();

    // If trying to uncomplete (already completed), always allow
    if (isCurrentlyCompleted) {
      // Uncomplete: uncomplete all today's tasks
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Uncomplete all today's tasks associated with this habit
      await this.prisma.task.updateMany({
        where: {
          habitId: id,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'COMPLETED',
        },
        data: {
          status: 'PENDING' as any,
          completedAt: null,
        },
      });

      // Also uncomplete any completed tasks for this habit (in case tasks don't have date filter)
      await this.prisma.task.updateMany({
        where: {
          habitId: id,
          status: 'COMPLETED',
        },
        data: {
          status: 'PENDING' as any,
          completedAt: null,
        },
      });

      await this.prisma.habit.update({
        where: { id },
        data: {
          completedToday: false,
          lastCompletedAt: now,
        },
      });
      // Log activity
      await this.logHabitActivity(id, false);
      // Recalculate streak after un-completing
      const newStreak = await this.calculateStreakByFrequency(id);
      return this.prisma.habit.update({
        where: { id },
        data: { streak: newStreak },
      });
    } else {
      // Trying to complete - check if habit has tasks that need to be completed first
      const canManual = await this.canManuallyComplete(id, userId);
      if (!canManual) {
        throw new Error('Cannot manually complete habit with tasks. Complete all tasks instead.');
      }

      const result = await this.prisma.habit.update({
        where: { id },
        data: {
          completedToday: true,
          lastCompletedAt: now,
        },
      });
      // Log activity
      await this.logHabitActivity(id, true);
      // Recalculate streak after completing
      const newStreak = await this.calculateStreakByFrequency(id);
      await this.prisma.habit.update({
        where: { id },
        data: { streak: newStreak },
      });
      return result;
    }
  }

  async toggleActive(id: string, userId: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { id, milestone: { vision: { userId } } },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    return this.prisma.habit.update({
      where: { id },
      data: { isActive: !habit.isActive },
    });
  }

async delete(id: string, userId: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { 
        id, 
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    // Option B: Convert tasks to standalone (remove habitId)
    await this.prisma.task.updateMany({
      where: { habitId: id },
      data: { habitId: null },
    });

    // Delete related habit activities
    await this.prisma.habitActivity.deleteMany({
      where: { habitId: id },
    });

    return this.prisma.habit.delete({
      where: { id },
    });
  }

  // Get best streak across all habits for a user
  async getBestStreak(userId: string): Promise<number> {
    const habits = await this.prisma.habit.findMany({
      where: {
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
      },
    });

    if (habits.length === 0) return 0;

    return Math.max(...habits.map(h => h.streak));
  }

  // Get count of habits completed today
  async getCompletedTodayCount(userId: string): Promise<number> {
    return this.prisma.habit.count({
      where: {
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
        completedToday: true,
        isActive: true,
      },
    });
  }

  // Get total active habits count
  async getTotalActiveHabits(userId: string): Promise<number> {
    return this.prisma.habit.count({
      where: {
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
        isActive: true,
      },
    });
  }

  // Get habit activity for the last N days
  async getHabitActivity(habitId: string, days: number = 30, userId?: string): Promise<any[]> {
    // Verify habit belongs to user if userId provided
    if (userId) {
      const habit = await this.prisma.habit.findFirst({
        where: { 
          id: habitId,
          OR: [
            { milestone: { vision: { userId } } },
            { milestoneId: null },
          ],
        },
      });
      if (!habit) {
        throw new NotFoundException('Habit not found');
      }
    }

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Get existing activities in range
    const activities = await this.prisma.habitActivity.findMany({
      where: {
        habitId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Generate all dates in range and merge with activities
    const result: any[] = [];
    const activityMap = new Map(
      activities.map(a => [a.date.toISOString().split('T')[0], a])
    );

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr);
      
      result.push({
        date: dateStr,
        completed: activity ? activity.completed : false,
      });
    }

    return result;
  }

  // Log or update habit activity
  private async logHabitActivity(habitId: string, completed: boolean): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.habitActivity.upsert({
      where: {
        habitId_date: {
          habitId,
          date: today,
        },
      },
      update: {
        completed,
      },
      create: {
        habitId,
        date: today,
        completed,
      },
    });

    // Also store a completion record for this habit (source of truth for streak)
    const completedAt = new Date();
    if (completed) {
      await this.prisma.completion.create({
        data: {
          habitId,
          completedAt,
        },
      });
    } else {
      // On uncomplete, remove today's completion records for this habit
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      await this.prisma.completion.deleteMany({
        where: {
          habitId,
          completedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
    }
  }

  /**
   * Tính lại streak dựa trên HabitActivity (schema-based, per-day).
   *
   * Ý tưởng:
   * - Lấy tất cả HabitActivity của habit (completed = true), sắp xếp theo ngày.
   * - Bắt đầu từ hôm nay (00:00:00), lùi từng ngày một (checkDate--).
   * - Với mỗi checkDate:
   *   + Nếu là ngày được xếp lịch: kiểm tra xem có activity completed = true cho ngày đó không.
   *     * Nếu CÓ  → streak++ và tiếp tục lùi ngày.
   *     * Nếu KHÔNG:
   *         - Nếu checkDate là hôm nay → bỏ qua (không cộng, không cắt streak), tiếp tục lùi ngày.
   *         - Nếu là quá khứ           → dừng (gãy streak).
   *
   * Lưu ý:
   * - Hiện tại schema chỉ có `frequencyPerWeek` (số ngày/tuần) mà không có lịch chi tiết (Thứ 2-4-6,...),
   *   nên tạm coi mọi ngày trong tuần đều là ngày có lịch (daily). Khi có trường lịch cụ thể,
   *   chỉ cần thay phần `isScheduledDay` bên dưới.
   */
  public async calculateStreakByFrequency(habitId: string): Promise<number> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      select: { frequencyPerWeek: true },
    });

    if (!habit || !habit.frequencyPerWeek || habit.frequencyPerWeek < 1) {
      return 0;
    }

    // Lấy toàn bộ HabitActivity đã completed = true cho habit này
    const activities = await this.prisma.habitActivity.findMany({
      where: {
        habitId,
        completed: true,
      },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (activities.length === 0) {
      return 0;
    }

    // Đưa về map theo YYYY-MM-DD để so sánh ngày (không lệch múi giờ)
    const completedDates = new Set(
      activities.map((a) => {
        const d = new Date(a.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`;
      }),
    );

    // Helper: normalize date về 00:00 local
    const normalizeDate = (d: Date): Date => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };

    const today = normalizeDate(new Date());
    let checkDate = new Date(today);
    let streak = 0;

    const isSameDay = (a: Date, b: Date): boolean =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    // Hiện tại: coi như thói quen là "daily" (ngày nào cũng là ngày có lịch)
    const isScheduledDay = (_date: Date): boolean => {
      return true;
    };

    // Bảo vệ: giới hạn tối đa số ngày lùi lại (vd. 365) để tránh vòng lặp vô hạn trong trường hợp bất thường
    const MAX_DAYS_BACK = 365;
    let daysChecked = 0;

    while (daysChecked < MAX_DAYS_BACK) {
      daysChecked++;

      if (!isScheduledDay(checkDate)) {
        // Không có lịch ngày này → lùi về ngày trước đó
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }

      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(checkDate.getDate()).padStart(2, '0')}`;

      if (completedDates.has(key)) {
        // Hoàn thành đúng ngày có lịch → cộng streak và lùi ngày
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }

      // Không có bản ghi completed cho ngày có lịch
      if (isSameDay(checkDate, today)) {
        // Hôm nay chưa hoàn thành thì KHÔNG cắt streak, chỉ bỏ qua hôm nay và lùi tiếp
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }

      // Ngày có lịch trong quá khứ nhưng không hoàn thành → gãy streak
      break;
    }

    return streak;
  }

  // Resync streak cho một habit dựa trên HabitActivity
  public async resyncHabitStreak(habitId: string): Promise<number> {
    const newStreak = await this.calculateStreakByFrequency(habitId);
    await this.prisma.habit.update({
      where: { id: habitId },
      data: { streak: newStreak },
    });
    return newStreak;
  }

  // Resync streak cho toàn bộ habits trong hệ thống
  public async resyncAllHabitsStreak(): Promise<void> {
    const habits = await this.prisma.habit.findMany({
      select: { id: true },
    });

    for (const habit of habits) {
      const newStreak = await this.calculateStreakByFrequency(habit.id);
      await this.prisma.habit.update({
        where: { id: habit.id },
        data: { streak: newStreak },
      });
    }
  }
}
