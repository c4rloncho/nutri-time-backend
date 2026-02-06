import {
  IsDateString,
  IsString,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

export class CreateTimeBlockDto {
  @IsDateString()
  date: string;

  @ValidateIf((o) => !o.allDay)
  @IsString()
  startTime?: string;

  @ValidateIf((o) => !o.allDay)
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
