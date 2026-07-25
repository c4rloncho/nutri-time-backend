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
import { CompleteAppointmentDto } from './dto/complete-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Public } from 'src/auth/public.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';

/**
 * Las observaciones de la consulta son privadas de la nutricionista.
 * Solo `GET /appointments` (rol NUTRITIONIST, sus propias citas) las devuelve.
 */
const stripNotes = (appointment: Appointment) => ({
  ...appointment,
  notes: undefined,
});

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
  async findMyAppointments(@Request() req) {
    const appointments = await this.appointmentService.findByPatient(
      req.user.id,
    );
    return appointments.map(stripNotes);
  }

  @Get('nutritionist/:id')
  async findByNutritionist(@Param('id', ParseIntPipe) id: number) {
    const appointments = await this.appointmentService.findByNutritionist(id);
    return appointments.map(stripNotes);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const appointment = await this.appointmentService.findOne(id);
    return appointment.nutritionistId === req.user.id
      ? appointment
      : stripNotes(appointment);
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
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: CompleteAppointmentDto,
  ) {
    return this.appointmentService.complete(id, req.user.id, dto.notes);
  }

  // antes de :id — si no, ParseIntPipe rechaza 'cancelled'
  @Delete('cancelled')
  @Roles(UserRole.NUTRITIONIST)
  removeCancelled(@Request() req) {
    return this.appointmentService.removeCancelled(req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.appointmentService.remove(id, req.user.id);
  }
}
