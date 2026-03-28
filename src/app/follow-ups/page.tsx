"use client"

import * as React from "react"
import { 
  Search, 
  Loader2, 
  RefreshCcw,
  ChevronRight,
  Activity,
  FileText,
  Eye,
  CalendarDays,
  MoreVertical,
  Trash2,
  Edit
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { fetchFollowUpTasks, deleteFollowUpRecord } from "@/app/actions/mysql-sync"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function FollowUpsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("pending")
  const [tasks, setTasks] = React.useState<any>({ pending: [], closed: [] })
  const [isLoading, setIsLoading] = React.useState(true)
  const [recordToDelete, setRecordToDelete] = React.useState<any | null>(null)

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

  const handleDelete = async () => {
    if (!recordToDelete) return
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      await deleteFollowUpRecord(config, recordToDelete.id)
      toast({ title: "随访记录已撤销" })
      loadData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "撤销失败", description: err.message })
    } finally {
      setRecordToDelete(null)
    }
  }

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
            "bg-white rounded-xl shadow-sm border border-l-4 transition-all hover:shadow-md overflow-hidden",
            r.anomalyCategory === 'A' ? "border-l-destructive" : "border-l-primary"
          )}
        >
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-4 pb-4 border-b">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-foreground leading-none">{r.patientName || "待补录"}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold opacity-60">
                  {r.patientGender} / {r.patientAge}岁
                </span>
              </div>
              
              <Badge variant={r.anomalyCategory === 'A' ? 'destructive' : 'default'} className={cn(
                "font-black text-[9px] h-4 px-1.5 tracking-tighter",
                r.anomalyCategory === 'B' && "bg-blue-500 hover:bg-blue-600"
              )}>
                {r.anomalyCategory}类异常
              </Badge>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-md text-sm font-bold border border-orange-300 shadow-sm">
                应随访: {r.nextFollowUpDate}
              </div>

              <div className="text-sm font-bold text-foreground">
                {r.patientPhone}
              </div>

              <div className="flex flex-col">
                <div className="text-sm font-bold text-foreground">{r.checkupDate}</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase opacity-50">NO: {r.checkupNumber}</div>
              </div>

              <div className="flex flex-col">
                <div className="text-sm font-bold text-foreground">{r.notificationDate}</div>
                <div className="text-[10px] text-muted-foreground opacity-50">通知: {r.notifier} / {r.notifiedPerson}</div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground mr-2 font-medium text-[10px] uppercase">末次随访:</span>
                <span className="font-bold text-green-600 text-sm">{r.lastFollowUpDate || "-"}</span>
              </div>
              
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded ml-auto">
                {r.archiveNo}
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-1 bg-muted/10 rounded-xl p-4 border border-primary/5 relative min-h-[80px]">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium">
                  {r.anomalyDetails}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0 w-44">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-md h-11 w-full font-bold">
                  <Link href={`/follow-ups/${r.anomalyId}/record`} className="flex items-center justify-between">
                    录入结果 <ChevronRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="text-muted-foreground h-9 w-full border-dashed">
                  <Link href={`/patients/${r.archiveNo}`} className="flex items-center justify-center gap-2">
                    <Activity className="size-3.5" /> 临床病历轴
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
    <div className="bg-white rounded-xl shadow-sm border border-primary/5 overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[180px]">患者姓名</TableHead>
            <TableHead className="w-[180px]">档案信息</TableHead>
            <TableHead className="w-[180px]">体检信息</TableHead>
            <TableHead className="max-w-[400px]">结果详情/分类</TableHead>
            <TableHead className="w-[180px]">通知日期/告知</TableHead>
            <TableHead className="w-[120px]">末次随访时间</TableHead>
            <TableHead className="text-right w-[150px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataList.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground">暂无结案记录</TableCell></TableRow>
          ) : dataList.map((r) => (
            <TableRow key={r.anomalyId} className="hover:bg-muted/5 group transition-colors">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-xl leading-tight">{r.patientName || "待补录"}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium opacity-70">
                    {r.patientGender} / {r.patientAge}岁
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <div className="text-sm font-bold text-foreground">
                    {r.patientPhone}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground mt-1 opacity-70">
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
                <div className="flex flex-col gap-1.5">
                  <Badge variant={r.anomalyCategory === 'A' ? 'destructive' : 'default'} className={cn(
                    "h-4 text-[8px] px-1.5 w-fit font-black tracking-tighter",
                    r.anomalyCategory === 'B' && "bg-blue-500 hover:bg-blue-600"
                  )}>
                    {r.anomalyCategory}类异常
                  </Badge>
                  <p className="text-xs leading-relaxed truncate opacity-80" title={r.anomalyDetails}>
                    {r.anomalyDetails}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-bold text-foreground">{r.notificationDate}</div>
                  <div className="text-[10px] text-muted-foreground opacity-70">告知: {r.notifier} / {r.notifiedPerson}</div>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-bold text-green-600 text-sm">
                  {r.lastFollowUpDate || "-"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-8" asChild title="查看详情">
                    <Link href={`/follow-ups/detail/${r.anomalyId}`}><Eye className="size-4 text-primary" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" asChild title="修改记录">
                    <Link href={`/follow-ups/detail/${r.anomalyId}/edit`}><Edit className="size-4 text-primary" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" asChild title="临床病历轴">
                    <Link href={`/patients/${r.archiveNo}`}><Activity className="size-4 text-primary" /></Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive font-bold text-xs" onSelect={() => setRecordToDelete(r)}><Trash2 className="size-3.5 mr-2" /> 撤销随访</DropdownMenuItem>
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
          <p className="text-muted-foreground font-medium">100% MySQL 驱动 • 随访动态监控</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" className="gap-2 bg-white">
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
          <TabsTrigger value="pending" className="flex gap-2 text-sm px-6 font-bold">
            待处理任务 <Badge className="bg-destructive text-[10px] h-4 px-1.5" variant="destructive">{filteredTasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-sm px-6 font-bold">已结案/历史</TabsTrigger>
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

      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认撤销随访记录？</AlertDialogTitle><AlertDialogDescription>此操作将永久移除该条随访结果，不可撤销。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">确认撤销</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
