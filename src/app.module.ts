import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, minutes } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentModule } from './appointment/appointment.module';
import { AvailabilityModule } from './availability/availability.module';
import databaseConfig from './database/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
  CacheModule.register({ isGlobal: true, ttl: 60 * 60 }),
  ThrottlerModule.forRoot([{ ttl: minutes(1), limit: 8 }]),
  TypeOrmModule.forRoot(databaseConfig),
    AppointmentModule,
    AvailabilityModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
