import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Redirect,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user-dto';
import { RegisterUserDto } from './dto/register-user-dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { Public } from './public.decorator';

interface JwtPayload {
  id: number;
  username: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  // -------- REGISTRO --------
  @Public()
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  // -------- LOGIN --------
  @Public()
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    const { access_token, refresh_token } = await this.authService.login(loginUserDto);
    return { success: true, message: 'Login successful', access_token, refresh_token };
  }

  // -------- GOOGLE LOGIN --------
  @Public()
  @Post('google')
  async googleLogin(@Body() dto: GoogleAuthDto) {
    const { access_token, refresh_token } = await this.authService.googleLogin(dto.idToken);
    return { success: true, message: 'Login con Google exitoso', access_token, refresh_token };
  }

  // -------- REFRESH --------
  @Public()
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(
    @Req() req: Request & { user: { id: number; role: string; refreshToken: string } },
  ) {
    const { access_token, refresh_token } = await this.authService.refresh(
      req.user.id,
      req.user.refreshToken,
    );
    return { success: true, message: 'Tokens renovados', access_token, refresh_token };
  }

  // -------- LOGOUT --------
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: Request & { user: { id: number } }) {
    await this.authService.logout(req.user.id);
    return { success: true, message: 'Logout successful' };
  }

  // -------- FORGOT PASSWORD --------
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { success: true, message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' };
  }

  // -------- RESET PASSWORD --------
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true, message: 'Contraseña restablecida exitosamente.' };
  }

  // -------- PERFIL ACTUAL --------
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: Request & { user: JwtPayload }) {
    const userId = req.user.id;
    return this.userService.findOne(userId);
  }

  // -------- GOOGLE CALENDAR --------
  @Get('google/calendar/url')
  @UseGuards(AuthGuard('jwt'))
  getCalendarUrl(@Req() req: Request & { user: { sub: number; id?: number } }) {
    const userId: number = req.user.sub ?? req.user.id;
    const url = this.authService.getCalendarAuthUrl(userId);
    return { url };
  }

  @Get('google/calendar/callback')
  @Public()
  @Redirect()
  async calendarCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    if (error || !code) {
      return { url: `${frontendUrl}/calendar-connect?success=false` };
    }
    try {
      await this.authService.handleCalendarCallback(code, state);
      return { url: `${frontendUrl}/calendar-connect?success=true` };
    } catch {
      return { url: `${frontendUrl}/calendar-connect?success=false` };
    }
  }

  @Get('google/calendar/status')
  @UseGuards(AuthGuard('jwt'))
  getCalendarStatus(@Req() req: Request & { user: { sub: number; id?: number } }) {
    const userId: number = req.user.sub ?? req.user.id;
    return this.authService.getCalendarStatus(userId);
  }

  @Delete('google/calendar')
  @UseGuards(AuthGuard('jwt'))
  disconnectCalendar(@Req() req: Request & { user: { sub: number; id?: number } }) {
    const userId: number = req.user.sub ?? req.user.id;
    return this.authService.disconnectCalendar(userId);
  }

  // -------- ACTUALIZAR PERFIL --------
  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = /\/(jpg|jpeg|png|webp|gif)$/i.test(file.mimetype);
        if (allowed) return cb(null, true);
        cb(new Error('Tipo de archivo no soportado'), false);
      },
    }),
  )
  async updateProfile(
    @Req() req: Request & { user: { sub: number; id?: number } },
    @Body() dto: UpdateProfileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    photo?: Express.Multer.File,
  ) {
    const userId: number = req.user.sub ?? req.user.id;
    return this.authService.updateProfile(userId, dto, photo);
  }
}
