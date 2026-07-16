import { existsSync } from 'fs';
import { join } from 'path';
import { randomDefaultAvatar } from '../default-avatars';

// Los SVG viven en el frontend; si alguien los mueve o renombra, este test lo caza.
const AVATARS_DIR = join(__dirname, '../../../../nutri-time-frontend/public/avatars');

describe('randomDefaultAvatar', () => {
  it('siempre devuelve una ruta con el formato esperado', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomDefaultAvatar()).toMatch(/^\/avatars\/([1-9]|1[0-2])\.svg$/);
    }
  });

  it('reparte entre los doce, no siempre el mismo', () => {
    const vistos = new Set(Array.from({ length: 500 }, randomDefaultAvatar));
    expect(vistos.size).toBe(12);
  });

  it('cada ruta que puede devolver existe de verdad en el frontend', () => {
    const vistos = new Set(Array.from({ length: 500 }, randomDefaultAvatar));
    for (const ruta of vistos) {
      expect(existsSync(join(AVATARS_DIR, ruta.replace('/avatars/', '')))).toBe(true);
    }
  });
});
