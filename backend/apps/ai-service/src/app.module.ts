import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@/config/database.config.js';
import configuration from '@/config/configuration.js';
import { ChatModule } from '@/modules/chat/chat.module.js';
import { KnowledgeModule } from '@/modules/knowledge/knowledge.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService, 'schema_ai'),
    }),
    ChatModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
