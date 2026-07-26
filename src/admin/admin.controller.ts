import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { AppointmentStatus } from 'src/appointment/enums/appointment-status.enum';

// JwtAuthGuard y RolesGuard son globales (APP_GUARD): basta con @Roles.
@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('stats')
  stats() {
    return this.adminService.stats();
  }

  @Get('users')
  findUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ) {
    return this.adminService.findUsers(page, limit, search, role);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  removeUser(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.adminService.removeUser(id, req.user.id);
  }

  @Get('appointments')
  findAppointments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: AppointmentStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAppointments(page, limit, status, search);
  }

  @Delete('appointments/:id')
  removeAppointment(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.removeAppointment(id);
  }
}
