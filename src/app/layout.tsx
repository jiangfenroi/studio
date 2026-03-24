
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Shell } from '@/components/layout/Shell';

export const metadata: Metadata = {
  title: 'HealthInsight Registry - 重要异常结果管理系统',
  description: '高效、严谨的体检重要异常结果登记与随访管理系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <FirebaseClientProvider>
          <Shell>
            {children}
          </Shell>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
