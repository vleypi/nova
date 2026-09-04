import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Asset } from './asset.entity';
import { MINIO_BUCKET, MINIO_CLIENT, MINIO_PRESIGN_CLIENT } from './minio.provider';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const MIME_WHITELIST = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const SHA256_RE = /^[a-f0-9]{64}$/;
const PRESIGN_TTL_SECONDS = 300;
const DEFAULT_MAX_SPACE_IMAGE_BYTES = 524_288_000;

export interface BoardAccessChecker {
  canWriteBoard(input: { boardId: string; userId: string }): Promise<
    | { allowed: true; spaceId: string }
    | { allowed: false; reason?: string }
  >;
  canReadSpace(input: { spaceId: string; userId: string }): Promise<{ allowed: boolean }>;
}

export const BOARD_ACCESS_CHECKER = 'BOARD_ACCESS_CHECKER';

export interface PresignInput {
  boardId: string;
  userId: string;
  mime: string;
  sizeBytes: number;
  sha256: string;
  width: number;
  height: number;
}

export interface PresignResult {
  assetId: string;
  uploadUrl: string;
  storageKey: string;
  duplicate: boolean;
}

export interface ConfirmInput {
  assetId: string;
  userId: string;
}

export interface ConfirmResult {
  proxyUrl: string;
}

export interface CheckAccessInput {
  assetId: string;
  userId: string;
}

export type CheckAccessResult =
  | {
      allowed: true;
      storageKey: string;
      mime: string;
      sizeBytes: number;
    }
  | { allowed: false };

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset) private readonly repo: Repository<Asset>,
    @Inject(MINIO_CLIENT) private readonly s3: S3Client,
    @Inject(MINIO_PRESIGN_CLIENT) private readonly s3Presign: S3Client,
    @Inject(MINIO_BUCKET) private readonly bucket: string,
    @Inject(BOARD_ACCESS_CHECKER) private readonly access: BoardAccessChecker,
  ) {}

  async presign(input: PresignInput): Promise<PresignResult> {
    if (!MIME_WHITELIST.has(input.mime)) {
      throw new BadRequestException(`Unsupported mime: ${input.mime}`);
    }
    if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException(`Invalid size: ${input.sizeBytes}`);
    }
    if (!SHA256_RE.test(input.sha256)) {
      throw new BadRequestException(`Invalid sha256`);
    }
    if (!Number.isInteger(input.width) || input.width <= 0 || !Number.isInteger(input.height) || input.height <= 0) {
      throw new BadRequestException(`Invalid dimensions`);
    }

    const access = await this.access.canWriteBoard({ boardId: input.boardId, userId: input.userId });
    if (!access.allowed) {
      throw new ForbiddenException(`No write access to board ${input.boardId}`);
    }

    const existing = await this.repo.findOne({
      where: { spaceId: access.spaceId, sha256: input.sha256, status: 'ready' },
    });
    if (existing) {
      return {
        assetId: existing.id,
        uploadUrl: '',
        storageKey: existing.storageKey,
        duplicate: true,
      };
    }

    await this.checkSpaceBudget(access.spaceId, input.sizeBytes);

    const assetId = randomUUID();
    const ext = extFromMime(input.mime);
    const storageKey = `spaces/${access.spaceId}/${assetId}.${ext}`;

    const row = this.repo.create({
      id: assetId,
      spaceId: access.spaceId,
      boardId: input.boardId,
      uploadedBy: input.userId,
      storageKey,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      sha256: input.sha256,
      status: 'pending',
    } as Asset);
    await this.repo.save(row);

    const uploadUrl = await getSignedUrl(
      this.s3Presign,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: input.mime,
        ContentLength: input.sizeBytes,
      }),
      { expiresIn: PRESIGN_TTL_SECONDS },
    );

    return { assetId, uploadUrl, storageKey, duplicate: false };
  }

  async confirm(input: ConfirmInput): Promise<ConfirmResult> {
    const row = await this.repo.findOne({ where: { id: input.assetId } });
    if (!row) {
      throw new BadRequestException(`Asset ${input.assetId} not found`);
    }

    let head;
    try {
      head = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: row.storageKey }),
      );
    } catch (err) {
      await this.repo.delete({ id: row.id });
      throw new BadRequestException(`Object not uploaded for asset ${row.id}`);
    }

    if (head.ContentLength !== row.sizeBytes) {
      await this.safeDeleteObject(row.storageKey);
      await this.repo.delete({ id: row.id });
      throw new BadRequestException(
        `Uploaded size ${head.ContentLength} does not match declared ${row.sizeBytes}`,
      );
    }
    if (head.ContentType && head.ContentType !== row.mime) {
      await this.safeDeleteObject(row.storageKey);
      await this.repo.delete({ id: row.id });
      throw new BadRequestException(
        `Uploaded content-type ${head.ContentType} does not match declared ${row.mime}`,
      );
    }

    row.status = 'ready';
    await this.repo.save(row);

    return { proxyUrl: `/api/assets/${row.id}` };
  }

  private async safeDeleteObject(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      /* best-effort */
    }
  }

  async checkAccess(input: CheckAccessInput): Promise<CheckAccessResult> {
    const row = await this.repo.findOne({ where: { id: input.assetId } });
    if (!row || row.status !== 'ready') return { allowed: false };

    const access = await this.access.canReadSpace({ spaceId: row.spaceId, userId: input.userId });
    if (!access.allowed) return { allowed: false };

    return {
      allowed: true,
      storageKey: row.storageKey,
      mime: row.mime,
      sizeBytes: row.sizeBytes,
    };
  }

  async getObjectStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    if (!res.Body) throw new Error(`No body for ${storageKey}`);
    return res.Body as NodeJS.ReadableStream;
  }

  private async checkSpaceBudget(spaceId: string, incomingBytes: number): Promise<void> {
    const cap = Number(process.env.MAX_SPACE_IMAGE_BYTES ?? DEFAULT_MAX_SPACE_IMAGE_BYTES);
    if (!Number.isFinite(cap) || cap <= 0) return;
    const raw = await this.repo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.sizeBytes), 0)', 'total')
      .where('a.spaceId = :spaceId', { spaceId })
      .andWhere("a.status = 'ready'")
      .getRawOne<{ total: string }>();
    const used = Number(raw?.total ?? 0);
    if (used + incomingBytes > cap) {
      const mb = Math.round(cap / (1024 * 1024));
      throw new ForbiddenException(`Space storage limit reached (${mb} MB)`);
    }
  }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}
