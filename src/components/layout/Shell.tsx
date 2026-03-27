
'use client';

import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { usePathname, useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const user = sessionStorage.getItem('staff_user');
    if (!user && pathname !== '/login') {
      router.replace('/login');
    } else {
      setIsReady(true);
    }
  }, [pathname, router]);

  if (!isReady && pathname !== '/login') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Activity className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <main className="min-h-full">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
