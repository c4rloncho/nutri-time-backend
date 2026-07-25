/**
 * Avatares por defecto que se asignan al azar al registrarse.
 * ponytail: son ficheros estaticos del frontend (public/avatars/), por eso guardamos
 * una ruta relativa y no una URL de R2 — no hay que subir ni pagar nada por ellos.
 * El acoplamiento es que el frontend debe servir esas rutas: si las mueves, actualiza esto.
 */
const DEFAULT_AVATAR_COUNT = 12;

export function randomDefaultAvatar(): string {
  const n = Math.floor(Math.random() * DEFAULT_AVATAR_COUNT) + 1;
  return `/avatars/${n}.svg`;
}

/**
 * Foto de perfil de Google, solo si es una foto de verdad: cuando el usuario no tiene,
 * Google sirve su monograma de letra en una URL .../a/default-user=...
 * ponytail: es una heurística sobre la URL, el token no trae ningún campo que lo diga.
 * Si Google cambia ese patrón empezarían a entrar monogramas — se ve mirando los
 * avatares de las cuentas nuevas. Devuelve null para caer en randomDefaultAvatar().
 * Pedimos s256 en vez del s96 que manda por defecto: se ve en pantallas retina.
 */
export function googleProfilePhoto(picture?: string): string | null {
  if (!picture || picture.includes('default-user')) return null;
  return picture.replace(/=s\d+(-c)?$/, '=s256-c');
}
