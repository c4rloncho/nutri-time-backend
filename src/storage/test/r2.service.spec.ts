import { ConfigService } from '@nestjs/config';
import { R2Service } from '../r2.service';

const CONFIG: Record<string, string> = {
  R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'alma-nutritiva',
  R2_PUBLIC_URL: 'https://cdn.example.com',
};

const makeService = (overrides: Partial<Record<string, string>> = {}) => {
  const config = {
    get: (k: string) => ({ ...CONFIG, ...overrides })[k],
  } as ConfigService;
  return new R2Service(config);
};

const jpeg = { mimetype: 'image/jpeg', buffer: Buffer.from('x') } as Express.Multer.File;

describe('R2Service', () => {
  it('devuelve una URL publica bajo el dominio configurado', async () => {
    const service = makeService();
    const send = jest.fn().mockResolvedValue({});
    (service as any).client = { send };

    const url = await service.uploadImage(jpeg, 'avatars');

    expect(url).toMatch(/^https:\/\/cdn\.example\.com\/avatars\/[0-9a-f-]{36}\.jpg$/);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('rechaza mimetypes fuera de la lista', async () => {
    const service = makeService();
    (service as any).client = { send: jest.fn() };

    await expect(
      service.uploadImage({ mimetype: 'application/pdf' } as Express.Multer.File, 'avatars'),
    ).rejects.toThrow();
  });

  it('queda deshabilitado y falla al subir si faltan credenciales', async () => {
    const service = makeService({ R2_BUCKET_NAME: undefined });

    expect(service.isEnabled).toBe(false);
    await expect(service.uploadImage(jpeg, 'avatars')).rejects.toThrow();
  });

  it('borra derivando la key desde la URL publica', async () => {
    const service = makeService();
    const send = jest.fn().mockResolvedValue({});
    (service as any).client = { send };

    await service.deleteByUrl('https://cdn.example.com/avatars/abc.jpg');

    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: 'alma-nutritiva', Key: 'avatars/abc.jpg' });
  });

  it('ignora URLs ajenas al bucket en vez de borrar una key arbitraria', async () => {
    const service = makeService();
    const send = jest.fn();
    (service as any).client = { send };

    await service.deleteByUrl('https://evil.example.net/avatars/abc.jpg');
    await service.deleteByUrl(null);

    expect(send).not.toHaveBeenCalled();
  });

  it('no propaga el fallo de borrado: perder un huerfano no rompe la operacion', async () => {
    const service = makeService();
    (service as any).client = { send: jest.fn().mockRejectedValue(new Error('boom')) };

    await expect(service.deleteByUrl('https://cdn.example.com/avatars/abc.jpg')).resolves.toBeUndefined();
  });
});
