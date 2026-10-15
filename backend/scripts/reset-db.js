import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/food_delivery';

const pool = new pg.Pool({ connectionString });

async function resetDb() {
  const client = await pool.connect();
  try {
    console.log('🔄 Đang xoá sạch các schema và bảng migrations...');
    await client.query(`
      DROP SCHEMA IF EXISTS schema_user CASCADE;
      DROP SCHEMA IF EXISTS schema_restaurant CASCADE;
      DROP SCHEMA IF EXISTS schema_order CASCADE;
      DROP SCHEMA IF EXISTS schema_delivery CASCADE;
      DROP SCHEMA IF EXISTS schema_admin CASCADE;
      DROP SCHEMA IF EXISTS schema_payment CASCADE;
      DROP TABLE IF EXISTS public.m_system_config CASCADE;
      DROP TABLE IF EXISTS public.pgmigrations_init CASCADE;
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA pg_catalog;
    `);
    console.log('✅ Đã xoá sạch các schema thành công.');
  } catch (err) {
    console.error('❌ Lỗi khi xoá schema:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDb();
