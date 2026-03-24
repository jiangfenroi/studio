'use client';

import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 系统主壳组件
 * 负责路由保护、权限验证状态显示及全局布局。
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // 处理登录保护逻辑
  React.useEffect(() => {
    // 仅在身份验证状态确定（不再加载）且用户未登录时跳转
    if (!isUserLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, isUserLoading, pathname, router]);

  // “正在验证医疗系统权限”是 Firebase Auth 正在确认您身份的加载状态
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-center">
            <p className="text-sm font-bold text-primary">正在验证临床系统访问权限</p>
            <p className="text-[10px] text-muted-foreground mt-1">医疗内网终端 • 安全通信链路建立中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 登录页面无需侧边栏布局
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // 如果未登录且不在登录页，不渲染内容（等待重定向）
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
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
