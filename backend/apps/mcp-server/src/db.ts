import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/food_delivery';

export const dbPool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});
