import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PatientProgressService } from './patient-progress.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateProgressDto } from './dto/create-progress.dto';
import { SetGoalDto } from './dto/set-goal.dto';

@Controller('patients/progress')
@UseGuards(JwtAuthGuard)
export class PatientProgressController {
  constructor(
    private readonly patientProgressService: PatientProgressService,
  ) {}

  @Get()
  getProgress(@Request() req) {
    return this.patientProgressService.getProgress(req.user.id);
  }

  @Post()
  addProgress(@Request() req, @Body() dto: CreateProgressDto) {
    return this.patientProgressService.addProgress(req.user.id, dto);
  }

  @Put('goal')
  setGoal(@Request() req, @Body() dto: SetGoalDto) {
    return this.patientProgressService.setGoal(req.user.id, dto);
  }

  @Delete(':id')
  deleteProgress(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.patientProgressService.deleteProgress(req.user.id, id);
  }
}
