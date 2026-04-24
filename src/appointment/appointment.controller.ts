import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateGuestAppointmentDto } from './dto/create-guest-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Public } from 'src/auth/public.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) { }

  @Post()
  @Roles(UserRole.PATIENT)
  create(@Request() req, @Body() createDto: CreateAppointmentDto) {
    return this.appointmentService.create(req.user.id, createDto);
  }

  @Post('guest')
  @Public()
  createGuest(@Body() createDto: CreateGuestAppointmentDto) {
    return this.appointmentService.createGuest(createDto);
  }

  @Get()
  @Roles(UserRole.NUTRITIONIST)
  findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointmentService.findAll(req.user.id, page, limit, status);
  }

  @Get('my-appointments')
  @Roles(UserRole.PATIENT)
  findMyAppointments(@Request() req) {
    return this.appointmentService.findByPatient(req.user.id);
  }

  @Get('nutritionist/:id')
  findByNutritionist(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.findByNutritionist(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateDto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(id, req.user.id, updateDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.cancel(id, req.user.id);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.NUTRITIONIST)
  confirm(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.confirm(id, req.user.id);
  }

  @Patch(':id/complete')
  @Roles(UserRole.NUTRITIONIST)
  complete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.complete(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.remove(id, req.user.id);
  }
}
