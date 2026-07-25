import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const databaseConfigAsync: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
    const nodeEnv = configService.get<string>('NODE_ENV');
    // ponytail: DB_SYNC deja crear el esquema en el primer deploy sin montar migraciones.
    // Ponerlo en true una vez, arrancar, y borrarlo. Si el esquema empieza a cambiar
    // con datos reales encima, ahí sí toca TypeORM migrations.
    const synchronize =
      configService.get<string>('DB_SYNC') === 'true' || nodeEnv !== 'production';

    console.log('NODE_ENV:', nodeEnv);
    console.log('Synchronize:', synchronize);

    return {
      type: 'postgres',
      host: configService.get<string>('DB_HOST'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME'),
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_DATABASE'),
      autoLoadEntities: true,
      synchronize,
      logging: ['error', 'warn'],
      // La red interna de Railway no ofrece SSL: forzarlo en produccion tumba el arranque.
      ssl: configService.get<string>('DB_SSL') === 'true'
        ? { rejectUnauthorized: false }
        : false,
    };
  },
};
