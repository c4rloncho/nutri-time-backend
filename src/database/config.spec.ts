import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfigAsync } from './config';

const build = (env: Record<string, string>) => {
  const config = { get: (key: string, fallback?: unknown) => env[key] ?? fallback };
  const factory = databaseConfigAsync.useFactory as (
    c: ConfigService,
  ) => TypeOrmModuleOptions;
  return factory(config as unknown as ConfigService) as TypeOrmModuleOptions & {
    synchronize: boolean;
    ssl: unknown;
  };
};

describe('databaseConfigAsync', () => {
  it('no sincroniza el esquema en produccion por defecto', () => {
    expect(build({ NODE_ENV: 'production' }).synchronize).toBe(false);
  });

  it('sincroniza en produccion solo con DB_SYNC=true', () => {
    expect(build({ NODE_ENV: 'production', DB_SYNC: 'true' }).synchronize).toBe(true);
  });

  it('sincroniza fuera de produccion', () => {
    expect(build({ NODE_ENV: 'development' }).synchronize).toBe(true);
  });

  it('no fuerza SSL en produccion sin DB_SSL', () => {
    expect(build({ NODE_ENV: 'production' }).ssl).toBe(false);
  });

  it('activa SSL con DB_SSL=true', () => {
    expect(build({ DB_SSL: 'true' }).ssl).toEqual({ rejectUnauthorized: false });
  });
});
