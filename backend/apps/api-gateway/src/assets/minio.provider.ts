import { S3Client } from '@aws-sdk/client-s3';
import { Provider } from '@nestjs/common';

export const GATEWAY_MINIO_CLIENT = Symbol('GATEWAY_MINIO_CLIENT');

export const gatewayMinioProvider: Provider = {
  provide: GATEWAY_MINIO_CLIENT,
  useFactory: () => {
    const endpoint = process.env.MINIO_ENDPOINT;
    const region = process.env.MINIO_REGION ?? 'us-east-1';
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    if (!endpoint || !accessKey || !secretKey) {
      throw new Error('[gateway minio] MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY must be set');
    }
    return new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
  },
};
