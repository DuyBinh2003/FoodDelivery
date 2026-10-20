import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3StorageService } from '@/common/storage/storage.service.js';

@Module({
  imports: [ConfigModule],
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class StorageModule {}
