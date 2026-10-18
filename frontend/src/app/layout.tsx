import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserSocketProvider } from "@/components/providers/user-socket-provider";
import { Toaster } from "react-hot-toast";
import { RoleRouteGuard } from "@/components/guards/role-route-guard";
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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {/* Navigation */}
        <Navbar />

        {/* Main content */}
        <QueryProvider>
          <UserSocketProvider>
            <RoleRouteGuard>
              {children}
            </RoleRouteGuard>
          </UserSocketProvider>
          <Toaster position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
