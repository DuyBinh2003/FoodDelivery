import type { SvgAssetSpec } from '@/common/seeding/seed-types.js';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function generateCardSvg(
  title: string,
  subtitle: string,
  color1: string,
  color2: string,
  iconText: string,
): string {
  const safeTitle = escapeXml(title);
  const safeSub = escapeXml(subtitle);
  const safeIcon = escapeXml(iconText);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.28" />
    </filter>
  </defs>
  <rect width="600" height="400" fill="url(#grad)" rx="24" />
  <rect x="20" y="20" width="560" height="360" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2" rx="16" />
  <circle cx="300" cy="155" r="64" fill="rgba(255,255,255,0.16)" filter="url(#shadow)" />
  <text x="300" y="172" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" text-anchor="middle" fill="#ffffff">${safeIcon}</text>
  <text x="300" y="258" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="#ffffff">${safeTitle}</text>
  <text x="300" y="294" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" text-anchor="middle" fill="rgba(255,255,255,0.88)">${safeSub}</text>
</svg>`;
}

export function generateAvatarSvg(name: string, color1: string, color2: string): string {
  const initial = escapeXml(name ? name.charAt(0).toUpperCase() : 'U');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="95" fill="url(#avatarGrad)" />
  <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3" />
  <text x="100" y="125" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="72" font-weight="bold" text-anchor="middle" fill="#ffffff">${initial}</text>
</svg>`;
}

export interface CategoryAssetMapping {
  readonly slug: string;
  readonly categoryName: string;
  readonly dishImageKey: string;
  readonly bannerImageKey: string;
  readonly iconKey: string;
}

export const CATEGORY_ASSET_KEYS: readonly CategoryAssetMapping[] = [
  {
    slug: 'pho',
    categoryName: 'Phở',
    dishImageKey: 'defaults/dishes/pho-bo-tai.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-pho.svg',
    iconKey: 'defaults/categories/cat-pho.svg',
  },
  {
    slug: 'bun-bo',
    categoryName: 'Bún Bò',
    dishImageKey: 'defaults/dishes/bun-bo-dac-biet.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-bunbo.svg',
    iconKey: 'defaults/categories/cat-bunbo.svg',
  },
  {
    slug: 'giai-khat',
    categoryName: 'Giải khát',
    dishImageKey: 'defaults/dishes/nuoc-chanh-day.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-drink.svg',
    iconKey: 'defaults/categories/cat-drink.svg',
  },
  {
    slug: 'com-tam',
    categoryName: 'Cơm Tấm',
    dishImageKey: 'defaults/dishes/com-tam-suon.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-comtam.svg',
    iconKey: 'defaults/categories/cat-comtam.svg',
  },
  {
    slug: 'tra-sua',
    categoryName: 'Trà Sữa',
    dishImageKey: 'defaults/dishes/tra-sua-duong-den.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-trasua.svg',
    iconKey: 'defaults/categories/cat-trasua.svg',
  },
  {
    slug: 'ga-ran-burger',
    categoryName: 'Gà Rán & Burger',
    dishImageKey: 'defaults/dishes/burger-ga-ran.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-burger.svg',
    iconKey: 'defaults/categories/cat-burger.svg',
  },
  {
    slug: 'banh-mi',
    categoryName: 'Bánh Mì',
    dishImageKey: 'defaults/dishes/banh-mi-dac-biet.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-banhmi.svg',
    iconKey: 'defaults/categories/cat-banhmi.svg',
  },
  {
    slug: 'pizza-mi-y',
    categoryName: 'Pizza & Mì Ý',
    dishImageKey: 'defaults/dishes/pizza-hai-san.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-pizza.svg',
    iconKey: 'defaults/categories/cat-pizza.svg',
  },
  {
    slug: 'mon-chay',
    categoryName: 'Món Chay',
    dishImageKey: 'defaults/dishes/mon-chay-healthy.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-chay.svg',
    iconKey: 'defaults/categories/cat-chay.svg',
  },
  {
    slug: 'ca-phe-banh',
    categoryName: 'Cà Phê & Bánh',
    dishImageKey: 'defaults/dishes/ca-phe-muoi.svg',
    bannerImageKey: 'defaults/banners/restaurant-banner-cafe.svg',
    iconKey: 'defaults/categories/cat-cafe.svg',
  },
];

export const POD_ASSET_KEYS = {
  PICKED_UP_1: 'defaults/proofs/pod-picked-up-1.svg',
  PICKED_UP_2: 'defaults/proofs/pod-picked-up-2.svg',
  DELIVERED_1: 'defaults/proofs/pod-delivered-1.svg',
  DELIVERED_2: 'defaults/proofs/pod-delivered-2.svg',
} as const;

export const DISPUTE_ASSET_KEYS = {
  SPILLED: 'defaults/disputes/evidence-spilled.svg',
  MISSING: 'defaults/disputes/evidence-missing.svg',
  LATE: 'defaults/disputes/evidence-late.svg',
} as const;

export const AVATAR_ASSET_KEYS = {
  CUSTOMER: 'defaults/avatars/customer.svg',
  CUSTOMER_ALT: 'defaults/avatars/customer-alt.svg',
  DRIVER: 'defaults/avatars/driver.svg',
  DRIVER_ALT: 'defaults/avatars/driver-alt.svg',
  RESTAURANT: 'defaults/avatars/restaurant.svg',
  ADMIN: 'defaults/avatars/admin.svg',
} as const;

export function buildS3Url(s3PublicPrefix: string, key: string): string {
  const cleanPrefix = s3PublicPrefix.replace(/\/$/, '');
  return `${cleanPrefix}/${key}`;
}

export function buildS3AssetSpecs(s3PublicPrefix: string): SvgAssetSpec[] {
  const cards: Array<{ key: string; title: string; sub: string; c1: string; c2: string; icon: string }> = [
    // Core Demo Dishes (preserving filenames used in sync-s3-seed & seed-restaurants)
    { key: 'defaults/dishes/pho-bo-tai.svg', title: 'Phở Bò Tái', sub: 'Thịt bò tươi thái mỏng đậm đà', c1: '#b91c1c', c2: '#ea580c', icon: '🍜' },
    { key: 'defaults/dishes/pho-bo-chin.svg', title: 'Phở Bò Chín', sub: 'Bò chín mềm nhừ thơm hồi quế', c1: '#c2410c', c2: '#d97706', icon: '🍲' },
    { key: 'defaults/dishes/pho-ga.svg', title: 'Phở Gà Ta', sub: 'Gà ta thả vườn dai ngọt xé phay', c1: '#ca8a04', c2: '#eab308', icon: '🍗' },
    { key: 'defaults/dishes/goi-cuon.svg', title: 'Gỏi Cuốn Tôm Thịt', sub: 'Tôm sú tươi chấm tương đen béo ngậy', c1: '#047857', c2: '#10b981', icon: '🥗' },
    { key: 'defaults/dishes/nuoc-chanh-day.svg', title: 'Nước Chanh Dây', sub: 'Chanh dây tươi chua ngọt mát lạnh', c1: '#e11d48', c2: '#fb7185', icon: '🍹' },
    { key: 'defaults/dishes/bun-bo-dac-biet.svg', title: 'Bún Bò Đặc Biệt', sub: 'Thập cẩm nạm gầu chả cua giò heo', c1: '#b91c1c', c2: '#7f1d1d', icon: '🍜' },
    { key: 'defaults/dishes/bun-bo-gio-heo.svg', title: 'Bún Bò Giò Heo', sub: 'Giò heo giòn sần sật cay nồng', c1: '#c2410c', c2: '#9a3412', icon: '🍲' },
    { key: 'defaults/dishes/bun-bo-cha-cua.svg', title: 'Bún Bò Chả Cua', sub: 'Chả cua biển xứ Huế thơm nức mũi', c1: '#ea580c', c2: '#f97316', icon: '🦀' },
    { key: 'defaults/dishes/cha-lua-hue.svg', title: 'Chả Lụa Huế', sub: 'Chả lụa lá chuối thơm nồng giòn dai', c1: '#4d7c0f', c2: '#65a30d', icon: '🍢' },
    { key: 'defaults/dishes/tra-da.svg', title: 'Trà Đá', sub: 'Trà lài ướp lạnh thanh mát', c1: '#0284c7', c2: '#38bdf8', icon: '🧊' },
    // Extended Category Dishes
    { key: 'defaults/dishes/com-tam-suon.svg', title: 'Cơm Tấm Sườn Bì Chả', sub: 'Sườn nướng mật ong than hoa chuẩn vị', c1: '#9a3412', c2: '#f59e0b', icon: '🍛' },
    { key: 'defaults/dishes/tra-sua-duong-den.svg', title: 'Trà Sữa Đường Đen', sub: 'Trân châu đường mía béo thơm', c1: '#78350f', c2: '#d97706', icon: '🧋' },
    { key: 'defaults/dishes/burger-ga-ran.svg', title: 'Burger & Gà Rán', sub: 'Giòn rụm phô mai tan chảy', c1: '#dc2626', c2: '#f97316', icon: '🍔' },
    { key: 'defaults/dishes/banh-mi-dac-biet.svg', title: 'Bánh Mì Sài Gòn', sub: 'Giòn rụm đầy đặn thịt nướng pate', c1: '#b45309', c2: '#f59e0b', icon: '🥖' },
    { key: 'defaults/dishes/pizza-hai-san.svg', title: 'Pizza & Mì Ý', sub: 'Nướng lò củi phô mai kéo sợi', c1: '#b91c1c', c2: '#15803d', icon: '🍕' },
    { key: 'defaults/dishes/mon-chay-healthy.svg', title: 'Món Chay Thanh Đạm', sub: 'Rau củ nấm tươi dinh dưỡng tự nhiên', c1: '#065f46', c2: '#10b981', icon: '🥬' },
    { key: 'defaults/dishes/ca-phe-muoi.svg', title: 'Cà Phê & Bánh Ngọt', sub: 'Cà phê phin đậm vị cùng bánh bơ Pháp', c1: '#451a03', c2: '#a16207', icon: '☕' },
    // Banners
    { key: 'defaults/banners/restaurant-banner-pho.svg', title: 'Phở Gia Truyền', sub: 'Nước Dùng Hầm Xương 12 Giờ Chuẩn Vị', c1: '#7c2d12', c2: '#ea580c', icon: '🏪' },
    { key: 'defaults/banners/restaurant-banner-bunbo.svg', title: 'Bún Bò Cố Đô', sub: 'Đậm Đà Hương Vị Cố Đô Xứ Huế', c1: '#831843', c2: '#db2777', icon: '🏮' },
    { key: 'defaults/banners/restaurant-banner-drink.svg', title: 'Giải Khát Tươi Mát', sub: 'Trái Cây Ép Tươi 100% Mỗi Ngày', c1: '#0e7490', c2: '#06b6d4', icon: '🍹' },
    { key: 'defaults/banners/restaurant-banner-comtam.svg', title: 'Cơm Tấm Sài Gòn', sub: 'Hạt Tấm Thơm Dẻo - Sườn Nướng Than Hoa', c1: '#9a3412', c2: '#ea580c', icon: '🍛' },
    { key: 'defaults/banners/restaurant-banner-trasua.svg', title: 'Trà Sữa Thượng Hạng', sub: 'Đài Loan Nguyên Lá & Kem Cheese Béo', c1: '#6d28d9', c2: '#ec4899', icon: '🧋' },
    { key: 'defaults/banners/restaurant-banner-burger.svg', title: 'Gà Rán & Burger House', sub: 'Chiên Nóng Theo Đơn - Giao Nhanh 20 Phút', c1: '#b91c1c', c2: '#f59e0b', icon: '🍟' },
    { key: 'defaults/banners/restaurant-banner-banhmi.svg', title: 'Lò Bánh Mì Phố Thị', sub: 'Vỏ Giòn Rụm - Nhân Đầy Đặn Chuẩn Vị', c1: '#92400e', c2: '#d97706', icon: '🥖' },
    { key: 'defaults/banners/restaurant-banner-pizza.svg', title: 'Pizza & Pasta Kitchen', sub: 'Ẩm Thực Ý Nguyên Bản Cho Gia Đình', c1: '#14532d', c2: '#dc2626', icon: '🍕' },
    { key: 'defaults/banners/restaurant-banner-chay.svg', title: 'Ẩm Thực Chay An Lạc', sub: 'Thanh Tịnh - Thuần Tự Nhiên - Tốt Sức Khỏe', c1: '#047857', c2: '#22c55e', icon: '🌿' },
    { key: 'defaults/banners/restaurant-banner-cafe.svg', title: 'Cà Phê & Bakery Studio', sub: 'Rang Xay Tại Quán - Bánh Mới Ra Lò', c1: '#422006', c2: '#854d0e', icon: '🥐' },
    // Category Icons
    { key: 'defaults/categories/cat-pho.svg', title: 'Phở', sub: 'Phở Bò & Phở Gà', c1: '#059669', c2: '#10b981', icon: '🍜' },
    { key: 'defaults/categories/cat-bunbo.svg', title: 'Bún Bò', sub: 'Bún Bò Huế Truyền Thống', c1: '#b91c1c', c2: '#ef4444', icon: '🍲' },
    { key: 'defaults/categories/cat-drink.svg', title: 'Giải khát', sub: 'Nước Ép & Sinh Tố', c1: '#0284c7', c2: '#38bdf8', icon: '🍹' },
    { key: 'defaults/categories/cat-comtam.svg', title: 'Cơm Tấm', sub: 'Sườn Bì Chả Trứng', c1: '#d97706', c2: '#f59e0b', icon: '🍛' },
    { key: 'defaults/categories/cat-trasua.svg', title: 'Trà Sữa', sub: 'Trân Châu & Topping', c1: '#9333ea', c2: '#ec4899', icon: '🧋' },
    { key: 'defaults/categories/cat-burger.svg', title: 'Gà Rán & Burger', sub: 'Fast Food Nóng Giòn', c1: '#dc2626', c2: '#f97316', icon: '🍔' },
    { key: 'defaults/categories/cat-banhmi.svg', title: 'Bánh Mì', sub: 'Bánh Mì Việt Nam', c1: '#b45309', c2: '#eab308', icon: '🥖' },
    { key: 'defaults/categories/cat-pizza.svg', title: 'Pizza & Mì Ý', sub: 'Pizza Nướng & Pasta', c1: '#15803d', c2: '#ef4444', icon: '🍕' },
    { key: 'defaults/categories/cat-chay.svg', title: 'Món Chay', sub: 'Healthy & Chay Thuần', c1: '#047857', c2: '#34d399', icon: '🥗' },
    { key: 'defaults/categories/cat-cafe.svg', title: 'Cà Phê & Bánh', sub: 'Coffee & Pastry', c1: '#78350f', c2: '#b45309', icon: '☕' },
    // POD Proofs
    { key: POD_ASSET_KEYS.PICKED_UP_1, title: 'Đã Nhận Món Tại Quán', sub: 'Proof of Pickup #1 - Đóng gói niêm phong kỹ', c1: '#0369a1', c2: '#0284c7', icon: '📦' },
    { key: POD_ASSET_KEYS.PICKED_UP_2, title: 'Xác Nhận Lấy Hàng', sub: 'Proof of Pickup #2 - Đủ món & nước chấm', c1: '#0f766e', c2: '#14b8a6', icon: '🛵' },
    { key: POD_ASSET_KEYS.DELIVERED_1, title: 'Giao Thành Công Tận Tay', sub: 'Proof of Delivery #1 - Khách đã nhận đủ', c1: '#15803d', c2: '#22c55e', icon: '✅' },
    { key: POD_ASSET_KEYS.DELIVERED_2, title: 'Ảnh Giao Tại Cổng', sub: 'Proof of Delivery #2 - Gửi bảo vệ sảnh theo yêu cầu', c1: '#047857', c2: '#10b981', icon: '📸' },
    // Dispute Evidences
    { key: DISPUTE_ASSET_KEYS.SPILLED, title: 'Bằng Chứng Tràn Đổ', sub: 'Evidence Photo - Nắp hộp nước bị hở khi vận chuyển', c1: '#b91c1c', c2: '#f97316', icon: '⚠️' },
    { key: DISPUTE_ASSET_KEYS.MISSING, title: 'Bằng Chứng Thiếu Món', sub: 'Evidence Photo - Túi hàng giao thiếu phần ăn kèm', c1: '#991b1b', c2: '#ef4444', icon: '🧾' },
    { key: DISPUTE_ASSET_KEYS.LATE, title: 'Bằng Chứng Giao Trễ', sub: 'Evidence Photo - Thức ăn nguội do giao trễ giờ hẹn', c1: '#92400e', c2: '#ea580c', icon: '⏱️' },
  ];

  const avatars: Array<{ key: string; name: string; c1: string; c2: string }> = [
    { key: AVATAR_ASSET_KEYS.CUSTOMER, name: 'Khách', c1: '#16a34a', c2: '#22c55e' },
    { key: AVATAR_ASSET_KEYS.CUSTOMER_ALT, name: 'User', c1: '#0284c7', c2: '#38bdf8' },
    { key: AVATAR_ASSET_KEYS.DRIVER, name: 'Tài', c1: '#059669', c2: '#34d399' },
    { key: AVATAR_ASSET_KEYS.DRIVER_ALT, name: 'Ship', c1: '#0d9488', c2: '#2dd4bf' },
    { key: AVATAR_ASSET_KEYS.RESTAURANT, name: 'Quán', c1: '#ea580c', c2: '#fb923c' },
    { key: AVATAR_ASSET_KEYS.ADMIN, name: 'Admin', c1: '#7c3aed', c2: '#a78bfa' },
  ];

  const specs: SvgAssetSpec[] = cards.map((card) => ({
    key: card.key,
    publicUrl: buildS3Url(s3PublicPrefix, card.key),
    svgContent: generateCardSvg(card.title, card.sub, card.c1, card.c2, card.icon),
  }));

  for (const avatar of avatars) {
    specs.push({
      key: avatar.key,
      publicUrl: buildS3Url(s3PublicPrefix, avatar.key),
      svgContent: generateAvatarSvg(avatar.name, avatar.c1, avatar.c2),
    });
  }

  return specs;
}
