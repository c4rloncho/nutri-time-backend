import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET') ?? '';
    this.publicUrl = (this.config.get<string>('R2_PUBLIC_URL') ?? '').replace(/\/$/, '');

    // ponytail: sin credenciales el servicio queda inerte y avisa al subir, en vez de tumbar el arranque
    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicUrl) {
      this.logger.warn('R2 no configurado — la subida de imagenes esta deshabilitada');
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  /** Sube la imagen y devuelve su URL publica. */
  async uploadImage(file: Express.Multer.File, prefix: string): Promise<string> {
    if (!this.client) {
      throw new InternalServerErrorException('El almacenamiento de imagenes no esta configurado');
    }

    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      throw new InternalServerErrorException('Tipo de imagen no soportado');
    }

    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error(`Fallo al subir ${key} a R2`, err instanceof Error ? err.stack : err);
      throw new InternalServerErrorException('No se pudo subir la imagen');
    }

    return `${this.publicUrl}/${key}`;
  }

  /** Borra por URL publica. No lanza: perder un huerfano no debe romper la operacion del usuario. */
  async deleteByUrl(url: string | null): Promise<void> {
    if (!this.client || !url || !url.startsWith(`${this.publicUrl}/`)) return;

    const key = url.slice(this.publicUrl.length + 1);
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`No se pudo borrar ${key} de R2: ${err instanceof Error ? err.message : err}`);
    }
  }
}
