import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SingleflightService } from '@/common/cache/singleflight.service.js';
import { CacheStampedeService } from '@/common/cache/cache-stampede.service.js';
import { AtomicInventoryService } from '@/common/cache/atomic-inventory.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SingleflightService, CacheStampedeService, AtomicInventoryService],
  exports: [SingleflightService, CacheStampedeService, AtomicInventoryService],
})
export class CacheStampedeModule { }

