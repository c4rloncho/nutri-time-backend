import { IsNumber, Max, Min } from 'class-validator';

export class SetGoalDto {
  @IsNumber()
  @Min(20)
  @Max(500)
  startWeight: number;

  @IsNumber()
  @Min(20)
  @Max(500)
  goalWeight: number;
}
