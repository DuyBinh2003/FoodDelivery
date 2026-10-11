import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        destination: `${process.env.NEXT_PUBLIC_SEARCH_SERVICE_URL || 'http://localhost:3006'}/search/:path*`,
      },
      {
        source: '/api/restaurants/:path*',
        destination: `${process.env.NEXT_PUBLIC_RESTAURANT_SERVICE_URL || 'http://localhost:3003'}/restaurants/:path*`,
      },
      {
        source: '/api/orders/:path*',
        destination: `${process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || 'http://localhost:3004'}/orders/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3001'}/users/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3001'}/auth/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://localhost:3002'}/admin/:path*`,
      },
      {
        source: '/api/delivery/:path*',
        destination: `${process.env.NEXT_PUBLIC_DELIVERY_SERVICE_URL || 'http://localhost:3005'}/delivery/:path*`,
      },
    ];
  },
};

export default nextConfig;

