import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AssetsService } from './assets.service';

@Controller()
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @GrpcMethod('BoardsService', 'PresignAsset')
  async presignAsset(data: {
    boardId: string;
    userId: string;
    mime: string;
    sizeBytes: number;
    sha256: string;
    width: number;
    height: number;
  }) {
    const r = await this.assets.presign(data);
    return {
      assetId: r.assetId,
      uploadUrl: r.uploadUrl,
      storageKey: r.storageKey,
      duplicate: r.duplicate,
    };
  }

  @GrpcMethod('BoardsService', 'ConfirmAsset')
  async confirmAsset(data: { assetId: string; userId: string }) {
    const r = await this.assets.confirm(data);
    return { proxyUrl: r.proxyUrl };
  }

  @GrpcMethod('BoardsService', 'CheckAssetAccess')
  async checkAssetAccess(data: { assetId: string; userId: string }) {
    const r = await this.assets.checkAccess(data);
    if (r.allowed) {
      return {
        allowed: true,
        storageKey: r.storageKey,
        mime: r.mime,
        sizeBytes: r.sizeBytes,
      };
    }
    return { allowed: false, storageKey: '', mime: '', sizeBytes: 0 };
  }
}
