import { IsOptional, IsInt, IsBoolean, IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsInt()
  dailyGoal?: number;

  @IsOptional()
  @IsInt()
  pomodoroWork?: number;

  @IsOptional()
  @IsInt()
  pomodoroBreak?: number;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsString()
  theme?: string;
}
