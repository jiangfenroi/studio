"use client"

import * as React from "react"
import { 
  Search, 
  Activity,
  Clock,
  MoreVertical,
  Loader2,
  CalendarCheck2,
  AlertCircle,
  ChevronRight,
  History,
  Eye,
  RefreshCcw,
  Phone
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import Link from "next/link"
import { fetchFollowUpTasks } from "@/app/actions/mysql-sync"
import { useToast } from "@/hooks/use-toast"

export default function FollowUpsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("pending")
  const [tasks, setTasks] = React.useState<any>({ pending: [], closed: [] })
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null)

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

  const renderTable = (dataList: any[]) => (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px]">通知日期/时间</TableHead>
              <TableHead>档案信息</TableHead>
              <TableHead>体检编号/日期</TableHead>
              <TableHead className="max-w-[200px]">结果详情/分类</TableHead>
              <TableHead>告知人/被通知人</TableHead>
              <TableHead>随访状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataList.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground">暂无相关随访任务</TableCell></TableRow>
            ) : dataList.map((r) => (
              <TableRow key={r.anomalyId} className="hover:bg-muted/5 group transition-colors">
                <TableCell>
                  <div className="text-sm font-bold">{r.notificationDate}</div>
                  <div className="text-[10px] text-muted-foreground">{r.notificationTime}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-primary text-base">{r.patientName || "待补录"}</span>
                    {r.patientName && (
                      <div className="flex flex-col mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {r.patientGender} / {r.patientAge}岁
                        </span>
                        <span className="text-sm font-bold text-primary flex items-center gap-1.5 mt-1.5">
                          <Phone className="size-3" />
                          <span className="font-mono tracking-tighter">{r.patientPhone}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono">{r.checkupNumber}</div>
                  <div className="text-[10px] text-muted-foreground">体检: {r.checkupDate}</div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <Badge variant={r.anomalyCategory === 'A' ? 'destructive' : 'secondary'} className="h-4 text-[8px] px-1">
                        {r.anomalyCategory}类
                      </Badge>
                    </div>
                    <p className="text-xs line-clamp-2" title={r.anomalyDetails}>{r.anomalyDetails}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">告知: {r.notifier}</div>
                  <div className="text-xs text-muted-foreground">被告知: {r.notifiedPerson}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={r.isFollowUpRequired ? 'default' : 'outline'} className={r.isFollowUpRequired ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                      {r.isFollowUpRequired ? '已随访' : '未随访'}
                    </Badge>
                    {activeTab === 'pending' && r.nextFollowUpDate && (
                      <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                        <Clock className="size-3" /> 应随访: {r.nextFollowUpDate}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" title="查看详情" onClick={() => setSelectedRecord(r)}>
                      <Eye className="size-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="录入结果">
                      <Link href={`/follow-ups/${r.anomalyId}/record`}><ChevronRight className="size-4 text-amber-600" /></Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/patients/${r.archiveNo}`}><History className="size-4 mr-2" /> 查看完整病历轴</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">待随访任务管理</h1>
          <p className="text-muted-foreground font-medium">中心 MySQL 驱动：基于任务池的闭环随访系统</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCcw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} /> 刷新任务
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案编号、体检号..." 
          className="pl-10 h-11 bg-white" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12 bg-muted/50 p-1">
          <TabsTrigger value="pending" className="flex gap-2 text-base">
            待随访任务 <Badge className="bg-destructive" variant="destructive">{filteredTasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-base">已结案/历史</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed"><Loader2 className="animate-spin mx-auto mb-2 text-primary" /> 检索待随访任务...</div>
          ) : renderTable(filteredTasks.pending)}
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          {isLoading ? (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed"><Loader2 className="animate-spin mx-auto mb-2 text-primary" /> 检索历史记录...</div>
          ) : renderTable(filteredTasks.closed)}
        </TabsContent>
      </Tabs>

      {/* 详细预览 Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 bg-primary text-white">
            <DialogTitle>随访任务详细档案预览</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2">患者基础档案</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">姓名</span><span className="font-bold">{selectedRecord?.patientName || "未补录"}</span>
                  <span className="text-muted-foreground">档案编号</span><span className="font-mono">{selectedRecord?.archiveNo}</span>
                  <span className="text-muted-foreground">性别/年龄</span><span>{selectedRecord?.patientGender || "-"} / {selectedRecord?.patientAge || "-"}岁</span>
                  <span className="text-muted-foreground">联系电话</span><span className="font-bold text-primary font-mono text-base tracking-tighter">{selectedRecord?.patientPhone || "-"}</span>
                  <span className="text-muted-foreground">应随访日期</span><Badge variant="destructive">{selectedRecord?.nextFollowUpDate || "未设定"}</Badge>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2 text-destructive">临床发现详情</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">体检编号</span><span className="font-mono">{selectedRecord?.checkupNumber}</span>
                  <span className="text-muted-foreground">异常类别</span><Badge variant="destructive">{selectedRecord?.anomalyCategory}类</Badge>
                  <span className="text-muted-foreground">告知日期</span><span>{selectedRecord?.notificationDate} {selectedRecord?.notificationTime}</span>
                  <div className="col-span-2 mt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">医学异常描述</p>
                    <p className="p-3 bg-muted/30 rounded text-xs leading-relaxed whitespace-pre-wrap">{selectedRecord?.anomalyDetails}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
