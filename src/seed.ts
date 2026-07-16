import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { User, UserRole } from './user/entities/user.entity';

// ponytail: script suelto en vez de framework de migraciones/seeders.
// Upsert por email/username (ambos son unique): si ya existe, le pisa
// password/rol/precios. Pensado para DB local — ver guarda de NODE_ENV abajo.
const seeds = [
  {
    fullname: 'Admin',
    username: 'admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@nutritime.com',
    password: process.env.SEED_ADMIN_PASSWORD,
    role: UserRole.ADMIN,
  },
  {
    fullname: 'Javi P',
    username: 'javip',
    email: process.env.SEED_NUTRITIONIST_EMAIL ?? 'nutri@nutritime.com',
    password: process.env.SEED_NUTRITIONIST_PASSWORD,
    role: UserRole.NUTRITIONIST,
    price15: 10000,
    price30: 18000,
    price45: 25000,
    price60: 30000,
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed pisa contraseñas: no correr en production.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const users: Repository<User> = app.get(getRepositoryToken(User));

  for (const seed of seeds) {
    if (!seed.password) {
      throw new Error(`Falta la contraseña en env para ${seed.email}`);
    }
    const fields = { ...seed, password: await bcrypt.hash(seed.password, 10) };
    const existing = await users.findOneBy([
      { email: seed.email },
      { username: seed.username },
    ]);

    await users.save(existing ? users.merge(existing, fields) : users.create(fields));
    console.log(`${existing ? 'actualizado' : 'creado'}: ${seed.email} (${seed.role})`);
  }

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
