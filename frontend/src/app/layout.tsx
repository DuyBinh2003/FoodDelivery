import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProvider } from "@/components/providers/query-provider";
import { UserSocketProvider } from "@/components/providers/user-socket-provider";
import { Toaster } from "react-hot-toast";
import { RoleRouteGuard } from "@/components/guards/role-route-guard";
import { ChatWidget } from "@/features/ai-chat/components/ChatWidget";
import "./globals.css";

const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

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
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground selection:bg-orange-500/20 selection:text-orange-200"
      >
        {/* Navigation */}
        <Navbar />

        {/* Main content */}
        <QueryProvider>
          <UserSocketProvider>
            <RoleRouteGuard>
              {children}
            </RoleRouteGuard>
          </UserSocketProvider>
          <ChatWidget />
          <Toaster
            position="top-right"
            toastOptions={{
              className: '!bg-zinc-900 !text-zinc-100 !border !border-white/10 !shadow-2xl !backdrop-blur-md !text-sm !rounded-xl',
              duration: 3500,
              success: {
                iconTheme: {
                  primary: '#ea580c',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
