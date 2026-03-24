'use client';

import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';

/**
 * 系统主壳组件
 * 负责路由保护、零缓存权限验证及全局布局。
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // 严格路由保护：未登录状态下访问非登录页，强制跳转
  React.useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, isUserLoading, pathname, router]);

  // 加载状态提示（系统建立内网通信链路中）
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center animate-pulse">
            <p className="text-sm font-bold text-primary">建立安全临床通信链路...</p>
            <p className="text-[10px] text-muted-foreground mt-1">HealthInsight Registry • 正在校验内网访问授权</p>
          </div>
        </div>
      </div>
    );
  }

  // 登录页面采用全屏布局，不带侧边栏
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // 如果未登录且不在登录页，在 useEffect 触发跳转前不渲染内容，防止触发权限错误
  if (!user) {
    return null;
  }

  // 渲染主业务界面
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
