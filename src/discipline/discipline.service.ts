import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisciplineService {
  constructor(private prisma: PrismaService) {}

  async checkJournalRequired(userId: string): Promise<{ required: boolean; brokenDays: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let brokenDays = 0;

    for (let i = 1; i <= 3; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      const startOfDay = new Date(checkDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(checkDate);
      endOfDay.setHours(23, 59, 59, 999);

      const completedTask = await this.prisma.task.findFirst({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (!completedTask) {
        brokenDays++;
      }
    }

    return {
      required: brokenDays >= 3,
      brokenDays,
    };
  }

  async submitJournal(userId: string, reason: string): Promise<{
    journal: any;
    analysis: { patterns: string[]; suggestions: string[] };
  }> {
    const recentJournals = await this.prisma.journal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const reasons = recentJournals.map((j: any) => j.reason);
    reasons.push(reason);

    const analysis = this.analyzeJournal(reasons);

    const streak = await this.calculateCurrentStreak(userId);

    const journal = await this.prisma.journal.create({
      data: {
        userId,
        reason,
        aiAnalysis: JSON.stringify(analysis),
        streakCount: streak,
      },
    });

    return {
      journal,
      analysis,
    };
  }

  private analyzeJournal(reasons: string[]): { patterns: string[]; suggestions: string[] } {
    const allText = reasons.join(' ').toLowerCase();
    
    const patterns: string[] = [];
    const suggestions: string[] = [];

    if (allText.includes('busy') || allText.includes('work') || allText.includes('time')) {
      patterns.push('Time management issues detected');
      suggestions.push('Try time-blocking your day or waking up 30 minutes earlier');
    }
    
    if (allText.includes('tired') || allText.includes('sleep') || allText.includes('energy')) {
      patterns.push('Energy management could be improved');
      suggestions.push('Focus on sleep quality and morning routines');
    }
    
    if (allText.includes('motivation') || allText.includes('want') || allText.includes('feel')) {
      patterns.push('Motivation fluctuations detected');
      suggestions.push('Connect your goals to deeper "why" and use visual reminders');
    }
    
    if (allText.includes('distraction') || allText.includes('phone') || allText.includes('social')) {
      patterns.push('Distractions are interfering');
      suggestions.push('Create a distraction-free environment during focus time');
    }

    if (suggestions.length === 0) {
      suggestions.push('Start with smaller, more achievable daily goals');
      suggestions.push('Track your progress visually to maintain motivation');
      suggestions.push('Build a support system or accountability partner');
    }

    return { patterns, suggestions };
  }

  async getJournalHistory(userId: string, limit: number = 10) {
    return this.prisma.journal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async calculateCurrentStreak(userId: string): Promise<number> {
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
}
