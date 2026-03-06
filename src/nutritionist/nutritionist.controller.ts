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
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
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
  @Roles(UserRole.NUTRITIONIST)
  updatePrices(@Request() req, @Body() updatePricesDto: UpdatePricesDto) {
    return this.nutritionistService.updatePrices(req.user.id, updatePricesDto);
  }
}
