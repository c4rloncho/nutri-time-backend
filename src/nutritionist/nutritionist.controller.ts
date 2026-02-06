import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { NutritionistService } from './nutritionist.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('nutritionists')
@UseGuards(JwtAuthGuard)
export class NutritionistController {
  constructor(private readonly nutritionistService: NutritionistService) {}

  @Get()
  findAll() {
    return this.nutritionistService.findAll();
  }

  @Get(':id')
  getProfile(@Param('id', ParseIntPipe) id: number) {
    return this.nutritionistService.getProfile(id);
  }
}
