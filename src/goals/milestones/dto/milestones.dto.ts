import { IsString, IsOptional, IsDateString } from 'class-validator';
import { IsFutureDate } from '../../../common/validators/date.validator';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsFutureDate({ message: 'Ngày không được nhỏ hơn ngày hiện tại' })
  @IsDateString()
  targetDate?: string;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsFutureDate({ message: 'Ngày không được nhỏ hơn ngày hiện tại' })
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
