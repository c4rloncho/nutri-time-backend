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
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { UpdateAvailabilityBlockDto } from './dto/update-availability-block.dto';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { UpdateTimeBlockDto } from './dto/update-time-block.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) { }

  @Post()
  @Roles(UserRole.NUTRITIONIST)
  create(@Request() req, @Body() createDto: CreateAvailabilityBlockDto) {
    return this.availabilityService.create(req.user.id, createDto);
  }

  @Get('my-blocks')
  @Roles(UserRole.NUTRITIONIST)
  findMyBlocks(@Request() req) {
    return this.availabilityService.findAllByNutritionist(req.user.id);
  }

  @Get('nutritionist/:id')
  findByNutritionist(@Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.findAllByNutritionist(id);
  }

  @Get('slots')
  getAvailableSlots(
    @Query('nutritionistId', ParseIntPipe) nutritionistId: number,
    @Query('date') date: string,
  ) {
    const parsedDate = new Date(date);
    return this.availabilityService.getAvailableSlots(nutritionistId, parsedDate);
  }

  @Get('calendar')
  getCalendar(
    @Query('nutritionistId', ParseIntPipe) nutritionistId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    return this.availabilityService.getCalendar(
      nutritionistId,
      parsedStartDate,
      parsedEndDate,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.NUTRITIONIST)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateDto: UpdateAvailabilityBlockDto,
  ) {
    return this.availabilityService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.NUTRITIONIST)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.availabilityService.remove(id, req.user.id);
  }

  // ========== TIME BLOCK ENDPOINTS ==========

  @Post('time-blocks')
  @Roles(UserRole.NUTRITIONIST)
  createTimeBlock(@Request() req, @Body() createDto: CreateTimeBlockDto) {
    return this.availabilityService.createTimeBlock(req.user.id, createDto);
  }

  @Get('time-blocks/my-blocks')
  @Roles(UserRole.NUTRITIONIST)
  findMyTimeBlocks(@Request() req) {
    return this.availabilityService.findAllTimeBlocksByNutritionist(req.user.id);
  }

  @Get('time-blocks/nutritionist/:id')
  findTimeBlocksByNutritionist(@Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.findAllTimeBlocksByNutritionist(id);
  }

  @Get('time-blocks/:id')
  findOneTimeBlock(@Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.findOneTimeBlock(id);
  }

  @Patch('time-blocks/:id')
  @Roles(UserRole.NUTRITIONIST)
  updateTimeBlock(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateDto: UpdateTimeBlockDto,
  ) {
    return this.availabilityService.updateTimeBlock(id, req.user.id, updateDto);
  }

  @Delete('time-blocks/:id')
  @Roles(UserRole.NUTRITIONIST)
  removeTimeBlock(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.availabilityService.removeTimeBlock(id, req.user.id);
  }
}
