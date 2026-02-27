import { IsInt, IsNumber, IsOptional, IsString, Min, Max, IsBoolean } from 'class-validator';

export class CreateHabitDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * New simplified frequency model: days per week (1-7)
   * 1 = 1 day per week
   * 3 = 3 days per week
   * 7 = every day
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  frequencyPerWeek?: number;

  @IsOptional()
  @IsString()
  reminder?: string;

  @IsOptional()
  @IsString()
  milestoneId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;
}

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * New simplified frequency model: days per week (1-7)
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  frequencyPerWeek?: number;

  @IsOptional()
  @IsString()
  reminder?: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @IsOptional()
  @IsNumber()
  streak?: number;

  @IsOptional()
  @IsBoolean()
  completedToday?: boolean;

  @IsOptional()
  @IsString()
  milestoneId?: string;
}
