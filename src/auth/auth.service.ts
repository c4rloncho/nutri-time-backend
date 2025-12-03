// src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { LoginUserDto } from './dto/login-user-dto';
import { RegisterUserDto } from './dto/register-user-dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
        { email: ILike(identifier) }, // Case-insensitive
        { username: ILike(identifier) },
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.generateToken(user);
  }

  private async generateToken(user: User) {
    const payload = { sub: user.id, name: user.fullname };
    return {
      access_token: this.jwtService.sign(payload),
    };
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
