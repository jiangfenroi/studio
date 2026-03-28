
"use client"

import * as React from "react"
import { 
  Search, 
  Clock, 
  Loader2, 
  RefreshCcw,
  Phone,
  ChevronRight,
  History,
  FileText,
  CalendarDays,
  Activity,
  User
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { fetchFollowUpTasks } from "@/app/actions/mysql-sync"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function FollowUpsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("pending")
  const [tasks, setTasks] = React.useState<any>({ pending: [], closed: [] })
  const [isLoading, setIsLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (!config.host) throw new Error('数据库未配置')
      const data = await fetchFollowUpTasks(config)
      setTasks(data)
    } catch (err: any) {
      toast({ variant: "destructive", title: "任务加载失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const filteredTasks = React.useMemo(() => {
    const filter = (list: any[]) => list.filter(t => 
      t.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.archiveNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.checkupNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return {
      pending: filter(tasks.pending),
      closed: filter(tasks.closed)
    }
  }, [tasks, searchTerm])

  const renderTaskCards = (dataList: any[]) => (
    <div className="space-y-4">
      {dataList.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed py-20 text-center text-muted-foreground shadow-sm">
          <FileText className="size-10 mx-auto mb-3 opacity-20" />
          暂无相关随访任务
        </div>
      ) : dataList.map((r) => (
        <div 
          key={r.anomalyId} 
          className={cn(
            "bg-white rounded-xl shadow-sm border border-l-4 transition-all hover:shadow-md",
            r.anomalyCategory === 'A' ? "border-l-red-500" : "border-l-amber-500"
          )}
        >
          <div className="p-5">
            {/* Top Row: All Key Info in One Line */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4 pb-4 border-b">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">{r.patientName || "待补录"}</span>
              </div>
              
              <div className="text-sm text-muted-foreground font-medium">
                {r.patientGender} / {r.patientAge}岁
              </div>

              <Badge className={cn(
                "font-bold px-3 py-0.5",
                r.anomalyCategory === 'A' ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"
              )}>
                {r.anomalyCategory}类异常
              </Badge>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-100">
                <Clock className="size-3.5" />
                应随访日期: {r.nextFollowUpDate}
              </div>

              <div className={cn(
                "text-base font-bold flex items-center gap-1.5",
                r.anomalyCategory === 'A' ? "text-red-600" : "text-amber-600"
              )}>
                <Phone className="size-4" />
                <span className="font-mono">{r.patientPhone}</span>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground mr-1">体检号:</span>
                <span className="font-mono font-bold">{r.checkupNumber}</span>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground mr-1">发现日期:</span>
                <span className="font-medium">{r.notificationDate}</span>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground mr-1">最后随访:</span>
                <span className="font-medium text-blue-600">{r.lastFollowUpDate || "-"}</span>
              </div>
            </div>

            {/* Bottom Row: Details and Actions side by side */}
            <div className="flex gap-4 items-stretch">
              <div className="flex-1 bg-muted/30 rounded-lg p-4 border border-muted-foreground/5 relative min-h-[80px]">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-2">
                  <Activity className="size-3" /> 重要异常发现详情
                </p>
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {r.anomalyDetails}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0 w-44">
                <Button asChild className="bg-primary hover:bg-primary/90 shadow-sm h-10 w-full">
                  <Link href={`/follow-ups/${r.anomalyId}/record`} className="flex items-center justify-between">
                    录入随访结果 <ChevronRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="text-muted-foreground h-10 w-full border-dashed">
                  <Link href={`/patients/${r.archiveNo}`} className="flex items-center justify-center gap-2">
                    <History className="size-4" /> 查看病历档案
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">随访任务管理中心</h1>
          <p className="text-muted-foreground font-medium">MySQL 核心驱动 • 紧凑型临床看板</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2 bg-white">
          <RefreshCcw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} /> 刷新任务池
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、体检号..." 
          className="pl-12 h-14 bg-white shadow-sm text-lg border-primary/10 rounded-xl" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-fit h-12 bg-muted/50 p-1 mb-8">
          <TabsTrigger value="pending" className="flex gap-2 text-base px-6">
            待随访任务 <Badge className="bg-destructive text-[10px] h-5" variant="destructive">{filteredTasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-base px-6">已结案/历史</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0 outline-none">
          {isLoading ? (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed shadow-sm">
              <Loader2 className="animate-spin mx-auto mb-4 text-primary size-8" /> 
              正在检索实时待随访任务...
            </div>
          ) : renderTaskCards(filteredTasks.pending)}
        </TabsContent>

        <TabsContent value="closed" className="mt-0 outline-none">
          {isLoading ? (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed shadow-sm">
              <Loader2 className="animate-spin mx-auto mb-4 text-primary size-8" /> 
              正在检索临床历史档案...
            </div>
          ) : renderTaskCards(filteredTasks.closed)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
