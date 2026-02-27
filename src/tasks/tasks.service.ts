import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, FilterTasksDto, TaskStatusFilter, TaskTimeFilter, TaskSortBy, SortOrder } from './dto/tasks.dto';
import { HabitsService } from '../goals/habits/habits.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => HabitsService))
    private habitsService: HabitsService,
  ) {}

  async findAll(userId: string, filters?: { habitId?: string; milestoneId?: string; status?: string }) {
    const where: any = { userId };

    if (filters?.habitId) {
      where.habitId = filters.habitId;
    }

    if (filters?.milestoneId) {
      where.milestoneId = filters.milestoneId;
    }

    if (filters?.status) {
      where.status = filters.status as any;
    }

    return this.prisma.task.findMany({
      where,
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findToday(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.task.findMany({
      where: {
        userId,
        OR: [
          { createdAt: { gte: startOfDay, lte: endOfDay } },
          { dueDate: { gte: startOfDay, lte: endOfDay } },
          { completedAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async create(userId: string, dto: CreateTaskDto) {
    const data: any = {
      title: dto.title,
      description: dto.description,
      habitId: dto.habitId,
      milestoneId: dto.milestoneId,
      userId,
    };
    
    if (dto.dueDate) {
      data.dueDate = new Date(dto.dueDate);
    }

    return this.prisma.task.create({
      data,
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
    };
    
    if (dto.dueDate) {
      data.dueDate = new Date(dto.dueDate);
    }

    if (dto.status) {
      data.status = dto.status as any;
    }

    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
    });
  }

  async complete(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const now = new Date();
    const result = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED' as any,
        completedAt: now,
      },
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
    });

    // Store completion record for this task (source of truth)
    await this.prisma.completion.create({
      data: {
        taskId: id,
        completedAt: now,
      },
    });

    // Check and auto-complete habit if all tasks are done (streak will be recalculated there)
    if (task.habitId) {
      await this.habitsService.checkAndAutoCompleteHabit(task.habitId);
    }

    return result;
  }

  async updateStatus(id: string, userId: string, status: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const data: any = {
      status: status as any,
    };

    const now = new Date();
    if (status === 'COMPLETED') {
      data.completedAt = now;
    } else {
      data.completedAt = null;
    }

    const result = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
    });

    if (status === 'COMPLETED') {
      // Store completion record for this task
      await this.prisma.completion.create({
        data: {
          taskId: id,
          completedAt: now,
        },
      });

      // Check and auto-complete habit if all tasks are done
      if (task.habitId) {
        await this.habitsService.checkAndAutoCompleteHabit(task.habitId);
      }
    } else if (task.habitId) {
      // Remove completion records for this task when uncompleted
      await this.prisma.completion.deleteMany({
        where: {
          taskId: id,
        },
      });

      // Recalculate streak for the habit based on updated completions
      await this.habitsService.checkAndAutoCompleteHabit(task.habitId);
    }

    return result;
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.delete({
      where: { id },
    });
  }

  async findCompleted(userId: string) {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async findPending(userId: string) {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'SKIPPED'] },
      },
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOverdue(userId: string) {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    return this.prisma.task.findMany({
      where: {
        userId,
        status: 'PENDING',
        dueDate: { lt: now },
      },
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findFuture(userId: string) {
    const startOfTomorrow = new Date();
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);

    return this.prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: startOfTomorrow },
      },
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findFiltered(userId: string, filterDto: FilterTasksDto) {
    const where: any = { userId };
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (filterDto.status && filterDto.status !== TaskStatusFilter.ALL) {
      where.status = filterDto.status;
    }

    if (filterDto.time && filterDto.time !== TaskTimeFilter.ALL) {
      switch (filterDto.time) {
        case TaskTimeFilter.TODAY:
          where.OR = [
            { dueDate: { gte: startOfDay, lte: endOfDay } },
            { createdAt: { gte: startOfDay, lte: endOfDay } },
          ];
          break;
        case TaskTimeFilter.PAST:
          where.OR = [
            { dueDate: { lt: startOfDay } },
            { createdAt: { lt: startOfDay } },
          ];
          break;
        case TaskTimeFilter.FUTURE:
          where.dueDate = { gte: startOfTomorrow };
          break;
      }
    }

    if (filterDto.startDate && filterDto.endDate) {
      where.OR = [
        { dueDate: { gte: new Date(filterDto.startDate), lte: new Date(filterDto.endDate) } },
      ];
    }

    if (filterDto.milestoneId) {
      where.milestoneId = filterDto.milestoneId;
    }

    if (filterDto.habitId) {
      where.habitId = filterDto.habitId;
    }

    const orderBy: any = {};
    const sortField = filterDto.sortBy || TaskSortBy.CREATED_AT;
    const sortOrder = filterDto.order || SortOrder.DESC;

    switch (sortField) {
      case TaskSortBy.DUE_DATE:
        orderBy.dueDate = sortOrder;
        break;
      case TaskSortBy.CREATED_AT:
        orderBy.createdAt = sortOrder;
        break;
      case TaskSortBy.COMPLETED_AT:
        orderBy.completedAt = sortOrder;
        break;
      case TaskSortBy.TITLE:
        orderBy.title = sortOrder;
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    return this.prisma.task.findMany({
      where,
      include: {
        habit: true,
        milestone: {
          include: {
            vision: true,
          },
        },
      },
      orderBy,
    });
  }
}
