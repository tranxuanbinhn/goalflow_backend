import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { VisionsService } from '../goals/visions/visions.service';

// Helper function to get start of day in local timezone
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to get end of day in local timezone
function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Helper function to format date as YYYY-MM-DD in local timezone
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private visionsService: VisionsService,
  ) {}

  async getDailyReport(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = getStartOfDay(targetDate);
    const endOfDay = getEndOfDay(targetDate);

    // Get tasks that are relevant for this day:
    // 1. Tasks with dueDate on this day, OR
    // 2. Tasks created on this day (new tasks for that day)
    // For totalTasks, we count tasks that were either created on this day or have dueDate on this day
    
    const allTasksCreated = await this.prisma.task.findMany({
      where: {
        userId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const allTasksWithDueDate = await this.prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: startOfDay, lte: endOfDay },
      },
    });

    // Combine unique tasks (by id) - tasks that are either created on or due on this day
    const taskIds = new Set([
      ...allTasksCreated.map(t => t.id),
      ...allTasksWithDueDate.map(t => t.id)
    ]);
    const totalTasks = taskIds.size;

    // Get tasks completed on this day (for heatmap and completion tracking)
    const completedTasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const completedCount = completedTasks.length;
    // Completion rate: completed tasks / total tasks (tasks created or due on this day)
    const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    const dailyGoal = settings?.dailyGoal || 5;
    const energyLevel = Math.min((completedCount / dailyGoal) * 100, 100);
    const streak = await this.calculateStreak(userId);

    return {
      date: formatDateLocal(targetDate),
      totalTasks,
      completedTasks: completedCount,
      completionRate: Math.round(completionRate),
      energyLevel: Math.round(energyLevel),
      streak,
    };
  }

  async getWeeklyReport(userId: string) {
    const today = new Date();
    const weekData = [];

    // Get the start of today (local time)
    const startOfToday = getStartOfDay(today);
    
    // Generate 7 days: from 6 days ago to today
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startOfToday);
      date.setDate(date.getDate() - i);
      
      const startOfDay = getStartOfDay(date);
      const endOfDay = getEndOfDay(date);

      // Get all tasks relevant for this specific day
      const allTasksCreated = await this.prisma.task.findMany({
        where: {
          userId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      const allTasksWithDueDate = await this.prisma.task.findMany({
        where: {
          userId,
          dueDate: { gte: startOfDay, lte: endOfDay },
        },
      });

      // Combine unique tasks
      const taskIds = new Set([
        ...allTasksCreated.map(t => t.id),
        ...allTasksWithDueDate.map(t => t.id)
      ]);
      const totalTasks = taskIds.size;

      // Get tasks completed on this day
      const completedTasks = await this.prisma.task.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      const completedCount = completedTasks.length;
      const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

      // Get day name in English (e.g., Mon, Tue)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      weekData.push({
        date: formatDateLocal(date),
        dayName: dayName,
        totalTasks,
        completedTasks: completedCount,
        completionRate: Math.round(completionRate),
      });
    }

    const streak = await this.calculateStreak(userId);

    return {
      weekData,
      streak,
      totalCompleted: weekData.reduce((sum, day) => sum + day.completedTasks, 0),
      averageCompletion: Math.round(
        weekData.reduce((sum, day) => sum + day.completionRate, 0) / 7
      ),
    };
  }

  async getMonthlyReport(userId: string, year?: number, month?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    const heatmapData = [];
    const currentDate = new Date(startOfMonth);

    while (currentDate <= endOfMonth) {
      const dayReport = await this.getDailyReport(userId, currentDate.toISOString());
      heatmapData.push({
        date: formatDateLocal(currentDate),
        completedTasks: dayReport.completedTasks,
        completionRate: dayReport.completionRate,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const totalCompleted = heatmapData.reduce((sum, day) => sum + day.completedTasks, 0);
    const avgDaily = totalCompleted / heatmapData.length;

    return {
      year: targetYear,
      month: targetMonth,
      heatmapData,
      totalCompleted,
      averageDaily: Math.round(avgDaily),
    };
  }

  async getStreaks(userId: string) {
    return {
      current: await this.calculateStreak(userId),
      longest: await this.calculateLongestStreak(userId),
    };
  }

  /**
   * Tổng hợp analytics high-level cho trang Analyst.
   */
  async getOverview(userId: string, visionId?: string) {
    // 1. Vision progress trung bình
    const visions = await this.prisma.vision.findMany({
      where: { userId },
      include: {
        milestones: {
          include: {
            habits: {
              include: {
                activities: {
                  where: { completed: true },
                },
              },
            },
          },
        },
      },
    });

    let totalVisionProgress = 0;
    if (visions.length > 0) {
      const visionProgresses = visions.map((v: any) =>
        this.visionsService.calculateVisionProgressFromData(v),
      );
      const sum = visionProgresses.reduce((acc, v) => acc + v, 0);
      totalVisionProgress = Math.round(sum / visions.length);
    }

    // Danh sách visions cho dropdown
    const visionOptions = visions.map((v: any) => ({
      id: v.id,
      title: v.title,
      updatedAt: v.updatedAt,
      createdAt: v.createdAt,
      targetDate: v.targetDate,
    }));

    // 2. Consistency score 30 ngày gần nhất
    const today = dayjs().startOf('day');
    const startWindow = today.subtract(29, 'day'); // 30 days window

    // Lấy toàn bộ habits của user (theo cách habits.service đang filter)
    const habits = await this.prisma.habit.findMany({
      where: {
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
      },
      select: {
        id: true,
        title: true,
        frequencyPerWeek: true,
        createdAt: true,
      },
    });

    const habitIds = habits.map(h => h.id);

    const windowStartDate = startWindow.toDate();
    const windowEndDate = today.toDate();

    // Lấy HabitActivity hoàn thành trong 30 ngày (cho consistency + habits yếu)
    const activitiesInWindow = habitIds.length
      ? await this.prisma.habitActivity.findMany({
          where: {
            habitId: { in: habitIds },
            completed: true,
            date: {
              gte: windowStartDate,
              lte: windowEndDate,
            },
          },
          select: {
            habitId: true,
            date: true,
          },
        })
      : [];

    const activityCountByHabit = new Map<string, number>();
    for (const act of activitiesInWindow) {
      activityCountByHabit.set(
        act.habitId,
        (activityCountByHabit.get(act.habitId) || 0) + 1,
      );
    }

    let totalExpected = 0;
    let totalActual = 0;
    const habitRatios: {
      habitId: string;
      title: string;
      completionRate: number;
    }[] = [];

    for (const habit of habits) {
      const freq = habit.frequencyPerWeek || 0;
      if (freq <= 0) continue;

      const habitCreated = dayjs(habit.createdAt).startOf('day');
      const activeStart = habitCreated.isAfter(startWindow)
        ? habitCreated
        : startWindow;

      const activeDays = today.diff(activeStart, 'day') + 1;
      if (activeDays <= 0) continue;

      const expected = activeDays * (freq / 7);
      if (expected <= 0) continue;

      const actual = activityCountByHabit.get(habit.id) || 0;
      const ratio = actual / expected;

      totalExpected += expected;
      totalActual += actual;

      const completionRate = Math.max(
        0,
        Math.min(100, Math.round(ratio * 100)),
      );
      habitRatios.push({
        habitId: habit.id,
        title: habit.title,
        completionRate,
      });
    }

    const consistencyScore =
      totalExpected > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((totalActual / totalExpected) * 100)),
          )
        : 0;

    // 3. Best streak từ Habit
    const habitForStreak = await this.prisma.habit.findMany({
      where: {
        OR: [
          { milestone: { vision: { userId } } },
          { milestoneId: null },
        ],
      },
      select: { streak: true },
    });
    const bestStreak =
      habitForStreak.length > 0
        ? Math.max(...habitForStreak.map(h => h.streak || 0))
        : 0;

    // 4. Tổng số task completed
    const totalTasksCompleted = await this.prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    // 5. Heatmap 1 năm qua (HabitActivity + Tasks)
    const startYear = today.subtract(364, 'day'); // 365 days including today
    const heatmapStartDate = startYear.toDate();

    const habitActivitiesYear = habitIds.length
      ? await this.prisma.habitActivity.findMany({
          where: {
            habitId: { in: habitIds },
            completed: true,
            date: {
              gte: heatmapStartDate,
              lte: windowEndDate,
            },
          },
          select: {
            date: true,
          },
        })
      : [];

    const tasksYear = await this.prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: heatmapStartDate,
          lte: windowEndDate,
        },
      },
      select: {
        completedAt: true,
      },
    });

    const heatmapMap = new Map<string, number>();
    for (const act of habitActivitiesYear) {
      const key = dayjs(act.date).format('YYYY-MM-DD');
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
    }
    for (const t of tasksYear) {
      if (!t.completedAt) continue;
      const key = dayjs(t.completedAt).format('YYYY-MM-DD');
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
    }

    const heatmap: { date: string; count: number }[] = [];
    for (let i = 0; i < 365; i++) {
      const d = startYear.add(i, 'day');
      const key = d.format('YYYY-MM-DD');
      heatmap.push({
        date: key,
        count: heatmapMap.get(key) || 0,
      });
    }

    // 6. Vision progress trend (Vision được chọn)
    // - Nếu có visionId: dùng visionId
    // - Nếu không: mặc định vision updatedAt gần nhất
    const selectedVision =
      visionId
        ? await this.prisma.vision.findFirst({
            where: { id: visionId, userId },
            include: {
              milestones: {
                include: {
                  habits: {
                    include: {
                      activities: {
                        where: { completed: true },
                      },
                    },
                  },
                },
              },
            },
          })
        : await this.prisma.vision.findFirst({
            where: { userId },
            orderBy: [{ updatedAt: 'desc' }],
            include: {
              milestones: {
                include: {
                  habits: {
                    include: {
                      activities: {
                        where: { completed: true },
                      },
                    },
                  },
                },
              },
            },
          });

    let visionTrend: any = null;

    let roadmap: any[] = [];

    if (selectedVision && selectedVision.targetDate) {
      const start = dayjs(selectedVision.createdAt).startOf('day');
      const target = dayjs(selectedVision.targetDate).startOf('day');
      const totalDaysVision = target.diff(start, 'day');

      const currentProgress =
        this.visionsService.calculateVisionProgressFromData(
          selectedVision as any,
        ) || 0;

      let idealToday = 0;
      if (totalDaysVision > 0) {
        const todayRaw = dayjs().startOf('day');
        const clampedToday = todayRaw.isBefore(start)
          ? start
          : todayRaw.isAfter(target)
          ? target
          : todayRaw;
        const elapsed = clampedToday.diff(start, 'day');
        idealToday = Math.round((elapsed / totalDaysVision) * 100);
        idealToday = Math.max(0, Math.min(100, idealToday));
      }

      // Ideal line: 0% at createdAt -> 100% at targetDate
      // Actual line: 0% at createdAt -> currentProgress at "today clamped" (inside range)
      const todayRaw = dayjs().startOf('day');
      const clampedToday = todayRaw.isBefore(start)
        ? start
        : todayRaw.isAfter(target)
        ? target
        : todayRaw;

      const line = [
        { date: start.format('YYYY-MM-DD'), current: 0, ideal: 0 },
        {
          date: clampedToday.format('YYYY-MM-DD'),
          current: currentProgress,
          ideal: idealToday,
        },
        { date: target.format('YYYY-MM-DD'), current: null, ideal: 100 },
      ];

      visionTrend = {
        visionId: selectedVision.id,
        title: selectedVision.title,
        startDate: start.format('YYYY-MM-DD'),
        targetDate: target.format('YYYY-MM-DD'),
        currentProgress,
        idealProgressToday: idealToday,
        line,
      };

      // Roadmap timeline data: milestones sorted by targetDate
      const milestonesWithTarget = (selectedVision.milestones || []).filter(
        (m: any) => m.targetDate,
      );

      milestonesWithTarget.sort(
        (a: any, b: any) =>
          new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
      );

      roadmap = milestonesWithTarget.map((m: any) => {
        // Tính progress milestone (tương tự visions.service)
        let progress = 0;
        if (m.habits && m.habits.length > 0 && m.targetDate) {
          const mStart = dayjs(m.createdAt).startOf('day');
          const mEnd = dayjs(m.targetDate).startOf('day');
          const totalDays = mEnd.diff(mStart, 'day') + 1;

          if (totalDays > 0) {
            let grandTotalTarget = 0;
            let totalActual = 0;

            for (const h of m.habits) {
              const freq = h.frequencyPerWeek || 0;
              if (freq <= 0) continue;

              const hTarget = (freq / 7) * totalDays;
              grandTotalTarget += hTarget;

              const completedCount = (h.activities || []).filter(
                (a: any) => a.completed,
              ).length;
              totalActual += completedCount;
            }

            if (grandTotalTarget > 0) {
              progress = Math.min(
                100,
                Math.max(
                  0,
                  Math.round((totalActual / grandTotalTarget) * 100),
                ),
              );
            }
          }
        }

        return {
          id: m.id,
          title: m.title,
          targetDate: dayjs(m.targetDate).format('YYYY-MM-DD'),
          status: m.status,
          progress,
          habits: (m.habits || []).map((h: any) => ({
            id: h.id,
            title: h.title,
          })),
        };
      });
    }

    // 7. Habits có tỉ lệ hoàn thành thấp nhất (top 5)
    const lowCompletionHabits = habitRatios
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 5);

    return {
      totalVisionProgress: Math.max(
        0,
        Math.min(100, totalVisionProgress || 0),
      ),
      consistencyScore,
      bestStreak,
      totalTasksCompleted,
      heatmap,
      visionTrend,
      visions: visionOptions,
      selectedVisionId: selectedVision?.id || null,
      roadmap,
      lowCompletionHabits,
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const completedTask = await this.prisma.task.findFirst({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (completedTask) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  private async calculateLongestStreak(userId: string): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'asc' },
    });

    if (tasks.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;
    let lastDate: Date | null = null;

    for (const task of tasks) {
      if (!task.completedAt) continue;
      
      const taskDate = new Date(task.completedAt);
      taskDate.setHours(0, 0, 0, 0);

      if (lastDate) {
        const diffDays = Math.floor(
          (taskDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }

      lastDate = taskDate;
    }

    return longestStreak;
  }
}
