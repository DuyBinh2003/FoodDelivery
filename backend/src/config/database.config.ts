import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('database.url'),
  // Tắt đồng bộ cấu trúc bảng để dùng schema migration từ node-pg-migrate
  synchronize: false,
  // Thư mục chứa các entities
  autoLoadEntities: true,
  // Bật log ở môi trường development
  logging: configService.get<string>('nodeEnv') === 'development',
});
