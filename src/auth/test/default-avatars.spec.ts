import { existsSync } from 'fs';
import { join } from 'path';
import { googleProfilePhoto, randomDefaultAvatar } from '../default-avatars';

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

describe('googleProfilePhoto', () => {
  it('acepta una foto real y la pide en tamaño 256', () => {
    expect(
      googleProfilePhoto('https://lh3.googleusercontent.com/a/ACg8ocKabc123=s96-c'),
    ).toBe('https://lh3.googleusercontent.com/a/ACg8ocKabc123=s256-c');
  });

  it('descarta el monograma que Google sirve cuando no hay foto', () => {
    expect(
      googleProfilePhoto('https://lh3.googleusercontent.com/a/default-user=s96-c'),
    ).toBeNull();
  });

  it('descarta el token sin campo picture', () => {
    expect(googleProfilePhoto(undefined)).toBeNull();
    expect(googleProfilePhoto('')).toBeNull();
  });

  it('deja pasar una URL sin sufijo de tamaño', () => {
    const url = 'https://lh3.googleusercontent.com/a/ACg8ocKabc123';
    expect(googleProfilePhoto(url)).toBe(url);
  });
});
