import type { NextConfig } from "next";

import path from "node:path";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    throw new Error(
      `[Next.js ConfigError] Thiếu biến môi trường bắt buộc: "${key}". Vui lòng khai báo trong .env.local.`
    );
  }
  return val;
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/search/:path*',
        destination: `${requireEnv('NEXT_PUBLIC_SEARCH_SERVICE_URL')}/search/:path*`,
      },
      {
        source: '/api/restaurants/:path*',
        destination: `${requireEnv('NEXT_PUBLIC_RESTAURANT_SERVICE_URL')}/restaurants/:path*`,
      },
      {
        source: '/api/orders/:path*',
        destination: `${requireEnv('NEXT_PUBLIC_ORDER_SERVICE_URL')}/orders/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${requireEnv('NEXT_PUBLIC_USER_SERVICE_URL')}/users/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${requireEnv('NEXT_PUBLIC_USER_SERVICE_URL')}/auth/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${requireEnv('NEXT_PUBLIC_ADMIN_SERVICE_URL')}/admin/:path*`,
      },
      {
        source: '/api/delivery/:path*',
        destination: `${requireEnv('NEXT_PUBLIC_DELIVERY_SERVICE_URL')}/delivery/:path*`,
      },
    ];
  },
};

export default nextConfig;

