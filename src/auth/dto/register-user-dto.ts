import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
  @IsString()
  @IsNotEmpty()
  fullname: string;
  @IsEmail()
  email: string;
}
