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
