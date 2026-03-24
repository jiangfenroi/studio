
"use client"

import * as React from "react"
import { 
  ClipboardList, 
  Users, 
  PlusCircle, 
  BarChart3, 
  Settings, 
  ShieldAlert,
  Home,
  Clock
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  {
    title: "首页概览",
    url: "/",
    icon: Home,
  },
  {
    title: "新增登记",
    url: "/records/new",
    icon: PlusCircle,
  },
  {
    title: "结果管理",
    url: "/records",
    icon: ClipboardList,
  },
  {
    title: "随访管理",
    url: "/follow-ups",
    icon: Clock,
  },
  {
    title: "档案中心",
    url: "/patients",
    icon: Users,
  },
  {
    title: "数据统计",
    url: "/stats",
    icon: BarChart3,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldAlert className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-primary">HealthInsight</span>
            <span className="text-xs text-muted-foreground">重要结果管理系统</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">主要功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url || pathname?.startsWith(item.url + '/')}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">辅助工具</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="系统设置">
                  <Settings className="size-5" />
                  <span>系统设置</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
            管
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">管理员用户</span>
            <span className="text-xs text-muted-foreground">内网环境 • 离线模式</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
