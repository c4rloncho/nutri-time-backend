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
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AppointmentStatus } from './enums/appointment-status.enum';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) { }

  @Post()
  create(@Request() req, @Body() createDto: CreateAppointmentDto) {
    return this.appointmentService.create(req.user.id, createDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointmentService.findAll(req.user.id, page, limit, status);
  }

  @Get('my-appointments')
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
  confirm(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.confirm(id, req.user.id);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.complete(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.remove(id, req.user.id);
  }
}
