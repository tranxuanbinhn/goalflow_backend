import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

// Register DTO
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;
}

// Login DTO
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

// Refresh Token DTO
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

// Auth Response DTO
export class UserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

export class AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

// Update Profile DTO
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

// Change Password DTO
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
