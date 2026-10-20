import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:4566';
const S3_BUCKET = process.env.S3_BUCKET || 'food-delivery-assets';
const REGION = process.env.AWS_REGION || 'ap-southeast-1';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/food_delivery';

const s3 = new S3Client({
  region: REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});

// Helper SVG generator with modern gradient cards
function generateSvgBadge(title, subtitle, color1, color2, iconText) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.3" />
    </filter>
  </defs>
  <rect width="600" height="400" fill="url(#grad)" rx="24" />
  <rect x="20" y="20" width="560" height="360" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" rx="16" />
  <circle cx="300" cy="160" r="64" fill="rgba(255,255,255,0.15)" filter="url(#shadow)" />
  <text x="300" y="175" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" text-anchor="middle" fill="#ffffff">${iconText}</text>
  <text x="300" y="260" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="#ffffff">${title}</text>
  <text x="300" y="295" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" text-anchor="middle" fill="rgba(255,255,255,0.85)">${subtitle}</text>
</svg>`;
}

function generateAvatarSvg(name, role, color1, color2) {
  const initial = name ? name.charAt(0).toUpperCase() : 'U';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="95" fill="url(#avatarGrad)" />
  <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3" />
  <text x="100" y="125" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="bold" text-anchor="middle" fill="#ffffff">${initial}</text>
</svg>`;
}

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    console.log(`Bucket ${S3_BUCKET} not found, creating...`);
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`Created bucket ${S3_BUCKET}`);
  }
}

async function uploadSvg(key, svgContent) {
  const buffer = Buffer.from(svgContent, 'utf-8');
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/svg+xml',
  }));
  return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
}

async function main() {
  console.log(`🚀 Starting S3 Seed Asset Synchronization...`);
  await ensureBucket();

  // 1. Generate & Upload Dishes
  const dishes = [
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', key: 'defaults/dishes/pho-bo-tai.svg', title: 'Phở Bò Tái', sub: 'Thịt bò tươi thái mỏng đậm đà', c1: '#b91c1c', c2: '#ea580c', icon: '🍜' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', key: 'defaults/dishes/pho-bo-chin.svg', title: 'Phở Bò Chín', sub: 'Bò chín mềm nhừ thơm hồi quế', c1: '#c2410c', c2: '#d97706', icon: '🍲' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', key: 'defaults/dishes/pho-ga.svg', title: 'Phở Gà Ta', sub: 'Gà ta thả vườn dai ngọt xé phay', c1: '#ca8a04', c2: '#eab308', icon: '🍗' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', key: 'defaults/dishes/goi-cuon.svg', title: 'Gỏi Cuốn Tôm Thịt', sub: 'Tôm sú tươi chấm tương đen béo ngậy', c1: '#047857', c2: '#10b981', icon: '🥗' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', key: 'defaults/dishes/nuoc-chanh-day.svg', title: 'Nước Chanh Dây', sub: 'Chanh dây tươi chua ngọt mát lạnh', c1: '#e11d48', c2: '#fb7185', icon: '🍹' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', key: 'defaults/dishes/bun-bo-dac-biet.svg', title: 'Bún Bò Đặc Biệt', sub: 'Thập cẩm nạm gầu chả cua giò heo', c1: '#b91c1c', c2: '#7f1d1d', icon: '🍜' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', key: 'defaults/dishes/bun-bo-gio-heo.svg', title: 'Bún Bò Giò Heo', sub: 'Giò heo giòn sần sật cay nồng', c1: '#c2410c', c2: '#9a3412', icon: '🍲' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', key: 'defaults/dishes/bun-bo-cha-cua.svg', title: 'Bún Bò Chả Cua', sub: 'Chả cua biển xứ Huế thơm nức mũi', c1: '#ea580c', c2: '#f97316', icon: '🦀' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', key: 'defaults/dishes/cha-lua-hue.svg', title: 'Chả Lụa Huế', sub: 'Chả lụa lá chuối thơm nồng giòn dai', c1: '#4d7c0f', c2: '#65a30d', icon: '🍢' },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', key: 'defaults/dishes/tra-da.svg', title: 'Trà Đá', sub: 'Trà lài ướp lạnh thanh mát', c1: '#0284c7', c2: '#38bdf8', icon: '🧊' },
  ];

  console.log(`📦 Uploading ${dishes.length} dish images to LocalStack S3...`);
  const dishUrlMap = new Map();
  for (const d of dishes) {
    const svg = generateSvgBadge(d.title, d.sub, d.c1, d.c2, d.icon);
    const url = await uploadSvg(d.key, svg);
    dishUrlMap.set(d.id, url);
  }

  // 2. Generate & Upload Restaurant Banners
  const banners = [
    { id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', key: 'defaults/banners/restaurant-banner-pho.svg', title: 'Phở Biên Hòa', sub: 'Hương Vị Truyền Thống Từ Năm 1985', c1: '#7c2d12', c2: '#ea580c', icon: '🏪' },
    { id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', key: 'defaults/banners/restaurant-banner-bunbo.svg', title: 'Bún Bò Huế Đông Ba', sub: 'Đậm Đà Hương Vị Cố Đô Xứ Huế', c1: '#831843', c2: '#db2777', icon: '🏮' },
  ];

  console.log(`🖼️ Uploading ${banners.length} restaurant banners to LocalStack S3...`);
  const bannerUrlMap = new Map();
  for (const b of banners) {
    const svg = generateSvgBadge(b.title, b.sub, b.c1, b.c2, b.icon);
    const url = await uploadSvg(b.key, svg);
    bannerUrlMap.set(b.id, url);
  }

  // 3. Generate & Upload Default Avatars
  const avatars = [
    { email: 'customer@fooddelivery.com', key: 'defaults/avatars/customer.svg', name: 'Khách Hàng', role: 'CUSTOMER', c1: '#f97316', c2: '#fb923c' },
    { email: 'driver@fooddelivery.com', key: 'defaults/avatars/driver.svg', name: 'Tài Xế', role: 'DRIVER', c1: '#10b981', c2: '#34d399' },
    { email: 'restaurant@fooddelivery.com', key: 'defaults/avatars/restaurant.svg', name: 'Chủ Quán', role: 'RESTAURANT_OWNER', c1: '#ef4444', c2: '#f87171' },
    { email: 'admin@fooddelivery.com', key: 'defaults/avatars/admin.svg', name: 'Quản Trị', role: 'ADMIN', c1: '#8b5cf6', c2: '#a78bfa' },
  ];

  console.log(`👤 Uploading ${avatars.length} default user avatars to LocalStack S3...`);
  const avatarUrlMap = new Map();
  for (const a of avatars) {
    const svg = generateAvatarSvg(a.name, a.role, a.c1, a.c2);
    const url = await uploadSvg(a.key, svg);
    avatarUrlMap.set(a.email, url);
  }

  // 4. Update Database
  console.log(`💾 Updating PostgreSQL database with S3 asset URLs...`);
  const pool = new pg.Pool({ connectionString: DB_URL });
  const client = await pool.connect();

  try {
    // Update Dishes
    for (const [dishId, url] of dishUrlMap.entries()) {
      await client.query(`UPDATE schema_restaurant.m_menu_item SET image_url = $1 WHERE id = $2`, [url, dishId]);
    }
    console.log(`✅ Updated ${dishUrlMap.size} menu items in database with S3 URLs`);

    // Update Restaurants
    for (const [restId, url] of bannerUrlMap.entries()) {
      await client.query(`UPDATE schema_restaurant.m_restaurant SET banner_url = $1 WHERE id = $2`, [url, restId]);
    }
    console.log(`✅ Updated ${bannerUrlMap.size} restaurants in database with S3 banner URLs`);

    // Update Users
    for (const [email, url] of avatarUrlMap.entries()) {
      await client.query(`UPDATE schema_user.m_user SET avatar_url = $1 WHERE email = $2`, [url, email]);
    }
    console.log(`✅ Updated ${avatarUrlMap.size} user avatars in database with S3 URLs`);

    console.log(`🎉 S3 Seed Assets Synchronization Completed Successfully!`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`❌ Sync S3 Seed Error:`, err);
  process.exit(1);
});
