import { Inject, Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export interface UploadFileOptions {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  folder: string;
  maxSizeBytes?: number;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class S3StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlPrefix: string;
  private readonly logger = new Logger(S3StorageService.name);
  private bucketChecked = false;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region') || process.env.AWS_REGION || 'ap-southeast-1';
    const endpoint =
      this.configService.get<string>('s3.endpoint') ||
      process.env.S3_ENDPOINT ||
      process.env.LOCALSTACK_ENDPOINT ||
      'http://localhost:4566';
    const accessKeyId =
      this.configService.get<string>('aws.accessKeyId') || process.env.AWS_ACCESS_KEY_ID || 'test';
    const secretAccessKey =
      this.configService.get<string>('aws.secretAccessKey') || process.env.AWS_SECRET_ACCESS_KEY || 'test';

    this.bucket =
      this.configService.get<string>('s3.bucket') || process.env.S3_BUCKET || 'food-delivery-assets';
    this.publicUrlPrefix =
      this.configService.get<string>('s3.publicUrlPrefix') ||
      process.env.S3_PUBLIC_URL_PREFIX ||
      `${endpoint.replace(/\/$/, '')}/${this.bucket}`;

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true, // Crucial for LocalStack/MinIO path-style routing
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`Initialized S3StorageService with bucket: ${this.bucket}, endpoint: ${endpoint}`);
  }

  /**
   * Ensure bucket exists before operating
   */
  async ensureBucketExists(): Promise<void> {
    if (this.bucketChecked) return;

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketChecked = true;
    } catch {
      try {
        this.logger.warn(`Bucket ${this.bucket} not found, attempting to create...`);
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.bucketChecked = true;
        this.logger.log(`Successfully created bucket ${this.bucket}`);
      } catch (createErr: unknown) {
        const msg = createErr instanceof Error ? createErr.message : String(createErr);
        this.logger.error(`Failed to ensure S3 bucket exists: ${msg}`);
        // Do not throw here so application can start even if LocalStack is booting
      }
    }
  }

  /**
   * Upload file buffer to S3 bucket
   */
  async uploadFile(options: UploadFileOptions): Promise<string> {
    const { buffer, originalFilename, mimeType, folder, maxSizeBytes = DEFAULT_MAX_SIZE } = options;

    // 1. Validate file size
    if (buffer.length > maxSizeBytes) {
      throw new BadRequestException(
        `Kích thước tệp vượt quá giới hạn cho phép (${Math.round(maxSizeBytes / (1024 * 1024))}MB)`,
      );
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new BadRequestException(
        `Định dạng tệp không được hỗ trợ (${mimeType}). Chỉ chấp nhận JPEG, PNG, WEBP, GIF.`,
      );
    }

    // 3. Resolve file extension safely
    const rawExt = path.extname(originalFilename).toLowerCase();
    const safeExt = MIME_TO_EXT_MAP[mimeType.toLowerCase()] || rawExt || '.jpg';

    // 4. Generate clean, unique object key
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const uniqueKey = `${cleanFolder}/${randomUUID()}${safeExt}`;

    try {
      await this.ensureBucketExists();

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      const publicUrl = this.getPublicUrl(uniqueKey);
      this.logger.log(`Successfully uploaded asset to S3: ${publicUrl}`);
      return publicUrl;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error uploading file ${originalFilename} to S3: ${msg}`, stack);
      throw new InternalServerErrorException(`Không thể tải tệp lên kho lưu trữ S3: ${msg}`);
    }
  }

  /**
   * Delete file from S3 bucket
   */
  async deleteFile(fileUrlOrKey: string): Promise<void> {
    const key = this.extractKey(fileUrlOrKey);
    if (!key) return;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted asset from S3: ${key}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete asset ${key} from S3: ${msg}`);
    }
  }

  /**
   * Generate public URL from S3 key
   */
  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.publicUrlPrefix.replace(/\/$/, '')}/${cleanKey}`;
  }

  /**
   * Extract S3 object key from URL or raw key
   */
  extractKey(fileUrlOrKey: string): string | null {
    if (!fileUrlOrKey || typeof fileUrlOrKey !== 'string') return null;

    if (fileUrlOrKey.startsWith('http://') || fileUrlOrKey.startsWith('https://')) {
      const bucketSegment = `/${this.bucket}/`;
      const bucketIndex = fileUrlOrKey.indexOf(bucketSegment);
      if (bucketIndex !== -1) {
        return fileUrlOrKey.substring(bucketIndex + bucketSegment.length);
      }
      try {
        const urlObj = new URL(fileUrlOrKey);
        return urlObj.pathname.replace(/^\/+/, '').replace(new RegExp(`^${this.bucket}\\/`), '');
      } catch {
        return null;
      }
    }

    return fileUrlOrKey.replace(/^\/+/, '');
  }
}
