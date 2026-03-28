
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
  User,
  Activity,
  MoreVertical,
  Eye,
  ClipboardCheck
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null)

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

    // 历史/结案任务按通知日期降序排列
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
            {/* 顶栏：聚合所有关键信息，字体大小接近且协调 */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-3 pb-3 border-b">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">{r.patientName || "待补录"}</span>
              </div>
              
              <div className="text-sm text-muted-foreground font-medium">
                {r.patientGender} / {r.patientAge}岁
              </div>

              <Badge className={cn(
                "font-bold px-2 py-0.5 text-xs",
                r.anomalyCategory === 'A' ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              )}>
                {r.anomalyCategory}类异常
              </Badge>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-md text-sm font-bold border border-orange-300 shadow-sm">
                <Clock className="size-4" />
                应随访日期: {r.nextFollowUpDate}
              </div>

              <div className="text-base font-bold flex items-center gap-1.5 text-foreground">
                <Phone className="size-4 text-muted-foreground" />
                <span className="font-mono tracking-tighter">{r.patientPhone}</span>
              </div>

              <div className="text-sm text-foreground">
                <span className="text-muted-foreground mr-1">体检号:</span>
                <span className="font-mono font-bold">{r.checkupNumber}</span>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground mr-1">末次随访:</span>
                <span className="font-bold text-green-600">{r.lastFollowUpDate || "-"}</span>
              </div>
            </div>

            {/* 底部：详情左，按钮右 */}
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
            <TableHead>档案信息</TableHead>
            <TableHead>体检编号/日期</TableHead>
            <TableHead className="max-w-[400px]">结果详情/分类</TableHead>
            <TableHead>告知人/被通知人</TableHead>
            <TableHead>末次随访时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataList.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground">暂无结案记录</TableCell></TableRow>
          ) : dataList.map((r) => (
            <TableRow key={r.anomalyId} className="hover:bg-muted/5 group">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-base">{r.patientName || "待补录"}</span>
                  <div className="flex flex-col mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {r.patientGender} / {r.patientAge}岁
                    </span>
                    <span className="text-base font-bold text-foreground flex items-center gap-1.5 mt-1.5">
                      <Phone className="size-3.5" />
                      <span className="font-mono tracking-tighter text-base">{r.patientPhone}</span>
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs font-mono">{r.checkupNumber}</div>
                <div className="text-[10px] text-muted-foreground">体检: {r.checkupDate}</div>
              </TableCell>
              <TableCell className="max-w-[400px]">
                <div className="flex flex-col gap-1">
                  <Badge variant={r.anomalyCategory === 'A' ? 'destructive' : 'default'} className={cn(
                    "h-4 text-[8px] px-1 w-fit",
                    r.anomalyCategory === 'B' && "bg-primary hover:bg-primary/90"
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
                  <Button variant="ghost" size="icon" title="预览数据" onClick={() => setSelectedTask(r)}>
                    <Eye className="size-4 text-primary" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/patients/${r.archiveNo}`}><Activity className="size-4 mr-2" /> 查看完整病历轴</Link></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          <p className="text-muted-foreground font-medium">MySQL 核心驱动 • 临床随访监控看板</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2 bg-white">
          <RefreshCcw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} /> 刷新任务池
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、体检号..." 
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

      {/* 历史任务预览弹窗 */}
      <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5" />
              随访档案详情预览
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-8">
              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-primary border-b pb-2">
                  <User className="size-5" /> 患者与检查信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-1"><p className="text-muted-foreground">姓名</p><p className="font-bold text-base">{selectedTask?.patientName}</p></div>
                  <div className="space-y-1"><p className="text-muted-foreground">特征</p><p>{selectedTask?.patientGender} / {selectedTask?.patientAge} 岁</p></div>
                  <div className="space-y-1"><p className="text-muted-foreground">联系电话</p><p className="font-mono font-bold text-lg">{selectedTask?.patientPhone}</p></div>
                  <div className="space-y-1"><p className="text-muted-foreground">体检编号</p><p className="font-mono">{selectedTask?.checkupNumber}</p></div>
                  <div className="space-y-1"><p className="text-muted-foreground">异常类别</p>
                    <Badge variant={selectedTask?.anomalyCategory === 'A' ? 'destructive' : 'default'} className={cn(
                      "font-bold",
                      selectedTask?.anomalyCategory === 'B' && "bg-primary hover:bg-primary/90"
                    )}>
                      {selectedTask?.anomalyCategory}类异常
                    </Badge>
                  </div>
                  <div className="space-y-1"><p className="text-muted-foreground">末次随访</p><p className="text-green-600 font-bold">{selectedTask?.lastFollowUpDate || "-"}</p></div>
                </div>
              </section>
              <Separator />
              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-primary border-b pb-2">
                  <Activity className="size-5" /> 医学发现详情
                </h3>
                <div className="p-4 bg-muted/20 border rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedTask?.anomalyDetails}
                </div>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
