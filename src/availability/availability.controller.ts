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
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateAvailabilityBlockDto) {
    return this.availabilityService.create(req.user.userId, createDto);
  }

  @Get('my-blocks')
  findMyBlocks(@Request() req) {
    return this.availabilityService.findAllByNutritionist(req.user.userId);
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

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateDto: UpdateAvailabilityBlockDto,
  ) {
    return this.availabilityService.update(id, req.user.userId, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.availabilityService.remove(id, req.user.userId);
  }
}
