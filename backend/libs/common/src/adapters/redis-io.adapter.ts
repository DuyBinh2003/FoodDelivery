import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Logger, type INestApplication } from '@nestjs/common';
import { getWsCorsOptions } from '@/common/bootstrap/index.js';

export interface RedisClientLike {
  connect(): Promise<unknown>;
  duplicate(): RedisClientLike;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  quit(): Promise<unknown>;
  isOpen?: boolean;
}

export class RedisIoAdapter extends IoAdapter {
  private readonly adapterLogger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: RedisClientLike;
  private subClient?: RedisClientLike;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(redisUrl?: string): Promise<void> {
    const targetUrl = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.adapterLogger.log(`Connecting Socket.IO Redis Adapter to ${targetUrl}...`);

    const pubClient = createClient({ url: targetUrl });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.adapterLogger.error(`Socket.IO Redis PubClient Error: ${msg}`);
    });

    subClient.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.adapterLogger.error(`Socket.IO Redis SubClient Error: ${msg}`);
    });

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.pubClient = pubClient as unknown as RedisClientLike;
      this.subClient = subClient as unknown as RedisClientLike;
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.adapterLogger.log('Socket.IO Redis Adapter connected successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.adapterLogger.error(`Failed to connect Socket.IO Redis Adapter: ${msg}`);
      throw new Error(`Socket.IO Redis Adapter connection failed: ${msg}`, { cause: err });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override createIOServer(port: number, options?: ServerOptions): any {
    const serverOptions: ServerOptions = {
      ...(options as ServerOptions),
      maxHttpBufferSize: options?.maxHttpBufferSize ?? 1e6, // 1MB payload ceiling to prevent DoS
      transports: options?.transports ?? ['websocket', 'polling'],
      cors: {
        ...getWsCorsOptions(),
        ...(typeof options?.cors === 'object' && options?.cors !== null ? options.cors : {}),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = super.createIOServer(port, serverOptions) as any;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    } else {
      this.adapterLogger.warn('Redis adapter not initialized; falling back to in-memory Socket.IO adapter.');
    }
    return server;
  }

  getPubClient(): RedisClientLike | undefined {
    return this.pubClient;
  }

  getSubClient(): RedisClientLike | undefined {
    return this.subClient;
  }

  async close(): Promise<void> {
    const promises: Promise<unknown>[] = [];
    if (this.pubClient?.isOpen) {
      promises.push(this.pubClient.quit());
    }
    if (this.subClient?.isOpen) {
      promises.push(this.subClient.quit());
    }
    await Promise.all(promises);
    this.adapterLogger.log('Socket.IO Redis clients disconnected gracefully.');
  }
}
