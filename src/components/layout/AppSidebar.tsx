
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
import { Button } from "@/components/ui/button"
import { fetchConfigFromMysql } from "@/app/actions/mysql-sync"

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
  const [user, setUser] = React.useState<any>(null)
  const [config, setConfig] = React.useState<any>(null)

  const loadData = React.useCallback(async () => {
    const storedUser = sessionStorage.getItem('staff_user')
    if (storedUser) setUser(JSON.parse(storedUser))

    try {
      const mysqlConfig = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (mysqlConfig.host) {
        const remoteConfig = await fetchConfigFromMysql(mysqlConfig)
        setConfig(remoteConfig)
      }
    } catch (e) {
      console.error("Config fetch failed", e)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData, pathname])

  const isAdmin = user?.permissions === '管理员' || user?.jobId === '1058';

  const handleLogout = () => {
    sessionStorage.removeItem('staff_user');
    router.push("/login");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldAlert className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-primary truncate max-w-[140px]">
              {config?.appName || "HealthInsight"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">医疗终端控制台</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">临床业务功能</SidebarGroupLabel>
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
        
        {isAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">系统管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === "/settings"} 
                    tooltip="管理配置中心"
                  >
                    <Link href="/settings">
                      <Settings className="size-5" />
                      <span>配置中心</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="size-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary shrink-0 border border-primary/10">
              <User className="size-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">
                {user?.name || '未登录'}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {user?.role || '医生'} ({user?.permissions || '普通'})
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="退出系统">
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
