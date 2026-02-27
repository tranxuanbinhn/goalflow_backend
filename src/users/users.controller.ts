import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateUserSettingsDto } from './dto/users.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('settings')
  async getSettings(@Request() req: any) {
    return this.usersService.getSettings(req.user.id);
  }

  @Put('settings')
  async updateSettings(@Request() req: any, @Body() dto: UpdateUserSettingsDto) {
    return this.usersService.updateSettings(req.user.id, dto);
  }
}
