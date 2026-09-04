import {
  Body,
  Controller,
  Get,
  Inject,
  OnModuleInit,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { firstValueFrom, Observable } from 'rxjs';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PresignDto } from './dto/presign.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { GATEWAY_MINIO_CLIENT } from './minio.provider';
import { BOARDS_SERVICE, UserPayload } from '@app/common';

interface BoardsGrpcService {
  PresignAsset(data: any): Observable<{
    assetId: string;
    uploadUrl: string;
    storageKey: string;
    duplicate: boolean;
  }>;
  ConfirmAsset(data: any): Observable<{ proxyUrl: string }>;
  CheckAssetAccess(data: any): Observable<{
    allowed: boolean;
    storageKey: string;
    mime: string;
    sizeBytes: number;
  }>;
}

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController implements OnModuleInit {
  private grpc!: BoardsGrpcService;

  constructor(
    @Inject(BOARDS_SERVICE) private readonly client: ClientGrpc,
    @Inject(GATEWAY_MINIO_CLIENT) private readonly s3: S3Client,
  ) {}

  onModuleInit() {
    this.grpc = this.client.getService<BoardsGrpcService>('BoardsService');
  }

  @Post('presign')
  @Throttle({ 'assets-presign': { ttl: 60_000, limit: 30 } })
  async presign(@Req() req: Request, @Body() dto: PresignDto) {
    const user: UserPayload = req['user'];
    const r = await firstValueFrom(this.grpc.PresignAsset({ userId: user.id, ...dto }));
    return r;
  }

  @Post('confirm')
  async confirm(@Req() req: Request, @Body() dto: ConfirmDto) {
    const user: UserPayload = req['user'];
    const r = await firstValueFrom(this.grpc.ConfirmAsset({ userId: user.id, assetId: dto.assetId }));
    return r;
  }

  @Get(':id')
  async read(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    const meta = await firstValueFrom(this.grpc.CheckAssetAccess({ userId: user.id, assetId: id }));
    if (!meta.allowed) {
      res.status(403).send({ statusCode: 403, message: 'Forbidden' });
      return;
    }

    const obj = await this.s3.send(
      new GetObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: meta.storageKey,
      }),
    );

    res.setHeader('Content-Type', meta.mime);
    res.setHeader('Content-Length', String(meta.sizeBytes));
    res.setHeader('Cache-Control', 'private, max-age=604800');
    (obj.Body as NodeJS.ReadableStream).pipe(res);
  }
}
