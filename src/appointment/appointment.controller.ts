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
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateAppointmentDto) {
    return this.appointmentService.create(req.user.userId, createDto);
  }

  @Get()
  findAll() {
    return this.appointmentService.findAll();
  }

  @Get('my-appointments')
  findMyAppointments(@Request() req) {
    return this.appointmentService.findByPatient(req.user.userId);
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
    @Body() updateDto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(id, updateDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.cancel(id, req.user.userId);
  }

  @Patch(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.confirm(id, req.user.userId);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.complete(id, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.remove(id);
  }
}
