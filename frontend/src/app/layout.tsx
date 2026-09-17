import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { UtensilsCrossed, Menu, ClipboardList, LogIn } from "lucide-react";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodDelivery - Đặt món ngon giao tận nơi",
  description: "Hệ thống đặt đồ ăn trực tuyến với kiến trúc Microservices. Khám phá hàng trăm món ăn từ các nhà hàng uy tín.",
};

const NAV_ITEMS = [
  { href: "/menu", label: "Thực đơn", icon: Menu },
  { href: "/orders/f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", label: "Đơn hàng", icon: ClipboardList },
  { href: "/login", label: "Đăng nhập", icon: LogIn },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {/* Navigation */}
        <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow duration-300">
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                FoodDelivery
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        {/* Main content */}
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
