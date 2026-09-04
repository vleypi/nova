import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Provider } from '@nestjs/common';

export const MINIO_CLIENT = Symbol('MINIO_CLIENT');
export const MINIO_PRESIGN_CLIENT = Symbol('MINIO_PRESIGN_CLIENT');
export const MINIO_BUCKET = Symbol('MINIO_BUCKET');

export interface MinioEnv {
  endpoint: string;
  publicEndpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export function readMinioEnv(): MinioEnv {
  const endpoint = process.env.MINIO_ENDPOINT;
  const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT ?? endpoint;
  const region = process.env.MINIO_REGION ?? 'us-east-1';
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;
  if (!endpoint || !publicEndpoint || !accessKey || !secretKey || !bucket) {
    throw new Error(
      '[minio.provider] MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET must be set',
    );
  }
  return { endpoint, publicEndpoint, region, accessKey, secretKey, bucket };
}

export function createS3Client(env: MinioEnv, forPresign: boolean = false): S3Client {
  return new S3Client({
    endpoint: forPresign ? env.publicEndpoint : env.endpoint,
    region: env.region,
    credentials: { accessKeyId: env.accessKey, secretAccessKey: env.secretKey },
    forcePathStyle: true,
  });
}

export async function bootstrapBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    if (status !== 404 && err?.name !== 'NotFound' && err?.name !== 'NoSuchBucket') {
      throw err;
    }
  }
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
}

export const minioProviders: Provider[] = [
  {
    provide: MINIO_CLIENT,
    useFactory: async () => {
      const env = readMinioEnv();
      const client = createS3Client(env);
      await bootstrapBucket(client, env.bucket);
      return client;
    },
  },
  {
    provide: MINIO_PRESIGN_CLIENT,
    useFactory: () => {
      const env = readMinioEnv();
      return createS3Client(env, true);
    },
  },
  {
    provide: MINIO_BUCKET,
    useFactory: () => readMinioEnv().bucket,
  },
];
