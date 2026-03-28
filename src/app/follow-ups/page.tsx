"use client"

import * as React from "react"
import { 
  Search, 
  Clock, 
  Loader2, 
  RefreshCcw,
  ChevronRight,
  History,
  FileText,
  Activity,
  Eye
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

    const closedSorted = filter(tasks.closed).sort((a, b) => 
      (b.notificationDate || "").localeCompare(a.notificationDate || "")
    )

    return {
      pending: filter(tasks.pending),
      closed: closedSorted
    }
  }, [tasks, searchTerm])

  const renderPendingCards = (dataList: any[]) => (
    <div className="space-y-4">
      {dataList.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed py-20 text-center text-muted-foreground shadow-sm">
          <FileText className="size-10 mx-auto mb-3 opacity-20" />
          暂无相关待随访任务
        </div>
      ) : dataList.map((r) => (
        <div 
          key={r.anomalyId} 
          className={cn(
            "bg-white rounded-xl shadow-sm border border-l-4 transition-all hover:shadow-md",
            r.anomalyCategory === 'A' ? "border-l-destructive" : "border-l-primary"
          )}
        >
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-3 pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">{r.patientName || "待补录"}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {r.patientGender} / {r.patientAge}岁
                </span>
              </div>
              
              <Badge variant={r.anomalyCategory === 'A' ? 'destructive' : 'default'} className={cn(
                "font-bold text-[10px] h-5",
                r.anomalyCategory === 'B' && "bg-blue-500 hover:bg-blue-600"
              )}>
                {r.anomalyCategory}类异常
              </Badge>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-md text-sm font-bold border border-orange-300 shadow-sm">
                <Clock className="size-4" />
                应随访日期: {r.nextFollowUpDate}
              </div>

              <div className="text-base font-bold text-foreground">
                <span className="font-mono tracking-tighter">{r.patientPhone}</span>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground mr-1 font-normal text-[11px]">体检号:</span>
                <span className="font-mono font-bold text-foreground text-[11px]">{r.checkupNumber}</span>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground mr-1 font-normal text-[11px]">末次随访:</span>
                <span className="font-bold text-green-600 text-[11px]">{r.lastFollowUpDate || "-"}</span>
              </div>
              
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                {r.archiveNo}
              </div>
            </div>

            <div className="flex gap-4 items-stretch">
              <div className="flex-1 bg-muted/20 rounded-lg p-3 border border-muted-foreground/5 relative min-h-[60px]">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {r.anomalyDetails}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0 w-40 justify-center">
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 shadow-sm h-9 w-full">
                  <Link href={`/follow-ups/${r.anomalyId}/record`} className="flex items-center justify-between">
                    录入随访结果 <ChevronRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="text-muted-foreground h-9 w-full border-dashed">
                  <Link href={`/patients/${r.archiveNo}`} className="flex items-center justify-center gap-2">
                    <History className="size-3.5" /> 查看病历档案
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderHistoryTable = (dataList: any[]) => (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead>患者姓名</TableHead>
            <TableHead>档案信息</TableHead>
            <TableHead>体检信息</TableHead>
            <TableHead className="max-w-[400px]">结果详情/分类</TableHead>
            <TableHead>告知人/被通知人</TableHead>
            <TableHead>末次随访时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataList.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground">暂无结案记录</TableCell></TableRow>
          ) : dataList.map((r) => (
            <TableRow key={r.anomalyId} className="hover:bg-muted/5 group">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-xl leading-tight">{r.patientName || "待补录"}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    {r.patientGender} / {r.patientAge}岁
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <div className="text-sm font-bold text-foreground">
                    <span className="font-mono tracking-tighter">{r.patientPhone}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground mt-1">
                    {r.archiveNo}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <div className="text-sm font-bold text-foreground">{r.checkupDate}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase opacity-70">NO: {r.checkupNumber}</div>
                </div>
              </TableCell>
              <TableCell className="max-w-[400px]">
                <div className="flex flex-col gap-1">
                  <Badge variant={r.anomalyCategory === 'A' ? 'destructive' : 'default'} className={cn(
                    "h-4 text-[8px] px-1 w-fit font-black",
                    r.anomalyCategory === 'B' && "bg-blue-500 hover:bg-blue-600"
                  )}>
                    {r.anomalyCategory}类
                  </Badge>
                  <p className="text-xs leading-relaxed truncate" title={r.anomalyDetails}>
                    {r.anomalyDetails}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs">告知: {r.notifier}</div>
                <div className="text-xs text-muted-foreground">被告知: {r.notifiedPerson}</div>
              </TableCell>
              <TableCell>
                <span className="font-bold text-green-600 text-sm">
                  {r.lastFollowUpDate || "-"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" asChild title="查看详情">
                    <Link href={`/follow-ups/detail/${r.anomalyId}`}><Eye className="size-4 text-primary" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="查看病历轴">
                    <Link href={`/patients/${r.archiveNo}`}><Activity className="size-4" /></Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">随访任务管理中心</h1>
          <p className="text-muted-foreground font-medium">100% MySQL 驱动 • 随访动态监控</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2 bg-white">
          <RefreshCcw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} /> 刷新任务池
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案号、体检号..." 
          className="pl-12 h-12 bg-white shadow-sm text-lg border-primary/10 rounded-xl" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-fit h-11 bg-muted/50 p-1 mb-6">
          <TabsTrigger value="pending" className="flex gap-2 text-sm px-6">
            待随访任务 <Badge className="bg-destructive text-[10px] h-4 px-1.5" variant="destructive">{filteredTasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-sm px-6">已结案/历史</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0 outline-none">
          {isLoading ? (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed shadow-sm">
              <Loader2 className="animate-spin mx-auto mb-4 text-primary size-8" /> 
              正在检索实时待随访任务...
            </div>
          ) : renderPendingCards(filteredTasks.pending)}
        </TabsContent>

        <TabsContent value="closed" className="mt-0 outline-none">
          {isLoading ? (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed shadow-sm">
              <Loader2 className="animate-spin mx-auto mb-4 text-primary size-8" /> 
              正在检索临床历史档案...
            </div>
          ) : renderHistoryTable(filteredTasks.closed)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
