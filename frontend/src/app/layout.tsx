import type { Metadata } from 'next';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/footer/footer';
import { QueryProvider } from '@/components/providers/query-provider';
import { UserSocketProvider } from '@/components/providers/user-socket-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { LocaleProvider } from '@/components/providers/locale-provider';
import { MotionProvider } from '@/components/providers/motion-provider';
import { Toaster } from 'react-hot-toast';
import { RoleRouteGuard } from '@/components/guards/role-route-guard';
import { ChatWidget } from '@/features/ai-chat/components/ChatWidget';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoodDelivery - Giao đồ ăn tươi ngon tận nơi',
  description:
    'Nền tảng đặt món và giao vận thông minh theo thời gian thực với kiến trúc Microservices hiện đại.',
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
      className="h-full antialiased"
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary"
      >
        <ThemeProvider>
          <LocaleProvider>
            <MotionProvider>
              <QueryProvider>
                <UserSocketProvider>
                  <Navbar />
                  <RoleRouteGuard>
                    <div className="flex-1 flex flex-col">{children}</div>
                  </RoleRouteGuard>
                  <Footer />
                </UserSocketProvider>
                <ChatWidget />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    className:
                      '!bg-card !text-card-foreground !border !border-border !shadow-xl !backdrop-blur-md !text-sm !rounded-xl',
                    duration: 3500,
                    success: {
                      iconTheme: {
                        primary: '#16a34a',
                        secondary: '#ffffff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#dc2626',
                        secondary: '#ffffff',
                      },
                    },
                  }}
                />
              </QueryProvider>
            </MotionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
