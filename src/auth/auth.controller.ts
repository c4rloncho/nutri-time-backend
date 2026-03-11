// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user-dto';
import { RegisterUserDto } from './dto/register-user-dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './public.decorator';

interface JwtPayload {
  id: number;
  username: string;
}

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutos
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

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
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.login(loginUserDto);

    const isProd = process.env.NODE_ENV === 'production';

    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: ACCESS_COOKIE_MAX_AGE,
      path: '/',
    });

    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: '/auth/refresh',
    });

    return { success: true, message: 'Login successful' };
  }

  // -------- REFRESH --------
  @Public()
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(
    @Req() req: Request & { user: { id: number; role: string; refreshToken: string } },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.refresh(
      req.user.id,
      req.user.refreshToken,
    );

    const isProd = process.env.NODE_ENV === 'production';

    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: ACCESS_COOKIE_MAX_AGE,
      path: '/',
    });

    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: '/auth/refresh',
    });

    return { success: true, message: 'Tokens renovados' };
  }

  // -------- LOGOUT --------
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(
    @Req() req: Request & { user: { id: number } },
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(req.user.id);

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    } as const;

    response.clearCookie('access_token', { ...cookieOptions, path: '/' });
    response.clearCookie('refresh_token', { ...cookieOptions, path: '/auth/refresh' });

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
