import { PartialType } from '@nestjs/mapped-types';
import { CreateTimeBlockDto } from './create-time-block.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTimeBlockDto extends PartialType(CreateTimeBlockDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
