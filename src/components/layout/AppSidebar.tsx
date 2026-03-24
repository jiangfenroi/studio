
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
  Clock,
  LogOut,
  User,
  Activity
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
import { usePathname, useRouter } from "next/navigation"
import { useUser, useAuth, initiateSignOut, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { Button } from "@/components/ui/button"
import { doc } from "firebase/firestore"

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
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const auth = useAuth()

  const configRef = useMemoFirebase(() => doc(db, 'systemConfig', 'default'), [db])
  const { data: config } = useDoc(configRef)

  const handleLogout = () => {
    if (auth) {
      initiateSignOut(auth)
      router.push("/login")
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            {config?.appLogoFileName ? <Activity className="size-5" /> : <ShieldAlert className="size-5" />}
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-primary truncate max-w-[140px]">
              {config?.appName || "HealthInsight"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">管理控制台</span>
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
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/settings"} 
                  tooltip="系统配置"
                >
                  <Link href="/settings">
                    <Settings className="size-5" />
                    <span>系统配置</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="size-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary shrink-0 border border-primary/10">
              <User className="size-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">
                {user?.isAnonymous ? '匿名管理员' : (user?.email?.split('@')[0] || '系统用户')}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">医疗内网接入</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="退出登录">
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
