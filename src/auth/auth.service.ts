// src/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from 'src/user/entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { LoginUserDto } from './dto/login-user-dto';
import { RegisterUserDto } from './dto/register-user-dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MailService } from 'src/mail/mail.service';
import { GoogleCalendarService } from 'src/google-calendar/google-calendar.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) { }

  // ---------- REGISTRO ----------
  async register(registerUser: RegisterUserDto) {
    const { username, email, password, fullname } = registerUser;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email: email.toLowerCase() }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('El nombre de usuario ya existe');
      }
      if (existingUser.email === email.toLowerCase()) {
        throw new ConflictException('El correo electrónico ya existe');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      email: email.toLowerCase(),
      fullname,
    });

    await this.userRepository.save(newUser);

    this.mailService.sendWelcome({ fullname, email: email.toLowerCase() });

    return {
      success: true,
      message: 'Usuario registrado exitosamente',
    };
  }

  // ---------- LOGIN ----------
  async login(loginDto: LoginUserDto) {
    const { password, identifier } = loginDto;

    const user = await this.userRepository.findOne({
      where: [
        { email: ILike(identifier) },
        { username: ILike(identifier) },
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.generateTokens(user);
  }

  // ---------- GOOGLE LOGIN ----------
  async googleLogin(idToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const client = new OAuth2Client(clientId);

    let payload: { sub: string; email: string; name: string; picture?: string };
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      const p = ticket.getPayload();
      if (!p?.sub || !p?.email) throw new Error();
      payload = { sub: p.sub, email: p.email, name: p.name ?? p.email, picture: p.picture };
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    let user = await this.userRepository.findOne({
      where: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
    });

    if (!user) {
      const username = await this.generateUniqueUsername(payload.email);
      user = this.userRepository.create({
        fullname: payload.name,
        email: payload.email.toLowerCase(),
        username,
        googleId: payload.sub,
        password: null,
      });
      await this.userRepository.save(user);
      this.mailService.sendWelcome({ fullname: payload.name, email: payload.email.toLowerCase() });
    } else if (!user.googleId) {
      await this.userRepository.update(user.id, { googleId: payload.sub });
      user.googleId = payload.sub;
    }

    return this.generateTokens(user);
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    let username = base;
    let attempts = 0;
    while (await this.userRepository.findOne({ where: { username } })) {
      username = `${base}_${Math.floor(Math.random() * 9000) + 1000}`;
      if (++attempts > 10) username = `${base}_${Date.now()}`;
    }
    return username;
  }

  // ---------- REFRESH ----------
  async refresh(userId: number, refreshToken: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Acceso denegado');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    return this.generateTokens(user);
  }

  // ---------- LOGOUT ----------
  async logout(userId: number) {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  // ---------- TOKENS ----------
  async generateTokens(user: User) {
    const payload = { sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_CONSTANT') || 'fallback-secret',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_CONSTANT') || 'fallback-refresh-secret',
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, { refreshToken: hashedRefreshToken });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  // ---------- FORGOT PASSWORD ----------
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Siempre responder igual para no revelar si el email existe
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.userRepository.update(user.id, {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: expires,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    this.mailService.sendPasswordReset({
      fullname: user.fullname,
      email: user.email,
      resetUrl,
    });
  }

  // ---------- RESET PASSWORD ----------
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: tokenHash },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      refreshToken: null, // invalida sesiones activas
    });
  }

  // ---------- GOOGLE CALENDAR ----------
  getCalendarAuthUrl(userId: number): string {
    const state = Buffer.from(userId.toString()).toString('base64url');
    return this.googleCalendarService.getAuthUrl(state);
  }

  async handleCalendarCallback(code: string, state: string): Promise<void> {
    const userId = parseInt(Buffer.from(state, 'base64url').toString(), 10);
    if (isNaN(userId)) throw new BadRequestException('Estado inválido');

    const { accessToken, refreshToken, expiry } =
      await this.googleCalendarService.exchangeCodeForTokens(code);

    await this.userRepository.update(userId, {
      googleCalendarAccessToken: accessToken,
      googleCalendarRefreshToken: refreshToken,
      googleCalendarTokenExpiry: expiry,
    });
  }

  async disconnectCalendar(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      googleCalendarAccessToken: null,
      googleCalendarRefreshToken: null,
      googleCalendarTokenExpiry: null,
    });
  }

  async getCalendarStatus(userId: number): Promise<{ connected: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return { connected: !!user?.googleCalendarAccessToken };
  }

  // ---------- PERFIL ----------
  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
    photo?: Express.Multer.File,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    Object.assign(user, dto);

    const updated = await this.userRepository.save(user);

    const { password, ...safeUser } = updated;
    return safeUser;
  }
}
