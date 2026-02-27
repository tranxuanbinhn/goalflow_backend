import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { IsFutureDate } from '../../common/validators/date.validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  habitId?: string;

  @IsOptional()
  @IsString()
  milestoneId?: string;

  @IsOptional()
  @IsFutureDate({ message: 'Ngày không được nhỏ hơn ngày hiện tại' })
  @IsDateString()
  dueDate?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsFutureDate({ message: 'Ngày không được nhỏ hơn ngày hiện tại' })
  @IsDateString()
  dueDate?: string;
}

export enum TaskStatusFilter {
  ALL = 'ALL',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum TaskTimeFilter {
  ALL = 'ALL',
  PAST = 'PAST',
  TODAY = 'TODAY',
  FUTURE = 'FUTURE',
}

export enum TaskSortBy {
  DUE_DATE = 'dueDate',
  CREATED_AT = 'createdAt',
  COMPLETED_AT = 'completedAt',
  TITLE = 'title',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class FilterTasksDto {
  @IsOptional()
  @IsEnum(TaskStatusFilter)
  status?: TaskStatusFilter;

  @IsOptional()
  @IsEnum(TaskTimeFilter)
  time?: TaskTimeFilter;

  @IsOptional()
  @IsString()
  milestoneId?: string;

  @IsOptional()
  @IsString()
  habitId?: string;

  @IsOptional()
  @IsEnum(TaskSortBy)
  sortBy?: TaskSortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
