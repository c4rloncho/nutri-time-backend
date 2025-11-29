import { PartialType } from '@nestjs/mapped-types';
import { CreateAvailabilityBlockDto } from './create-availability-block.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAvailabilityBlockDto extends PartialType(
  CreateAvailabilityBlockDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
