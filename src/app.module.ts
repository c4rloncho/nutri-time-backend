import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesGuard } from './auth/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, minutes } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentModule } from './appointment/appointment.module';
import { AvailabilityModule } from './availability/availability.module';
import { AuthModule } from './auth/auth.module';
import { NutritionistModule } from './nutritionist/nutritionist.module';
import { PatientProgressModule } from './patient-progress/patient-progress.module';
import { MealPlanModule } from './meal-plan/meal-plan.module';
import { databaseConfigAsync } from './database/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    CacheModule.register({ isGlobal: true, ttl: 60 * 60 }),
    ThrottlerModule.forRoot([{ ttl: minutes(1), limit: 8 }]),
    TypeOrmModule.forRootAsync(databaseConfigAsync),
    ScheduleModule.forRoot(),
    AppointmentModule,
    AvailabilityModule,
    AuthModule,
    NutritionistModule,
    PatientProgressModule,
    MealPlanModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule { }
