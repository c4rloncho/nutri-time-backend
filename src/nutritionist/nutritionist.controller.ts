import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NutritionistService } from './nutritionist.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdatePricesDto } from './dto/update-prices.dto';

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

  @Patch('prices')
  updatePrices(@Request() req, @Body() updatePricesDto: UpdatePricesDto) {
    return this.nutritionistService.updatePrices(req.user.userId, updatePricesDto);
  }
}
