
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
  History
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { fetchFollowUpTasks } from "@/app/actions/mysql-sync"
import { useToast } from "@/hooks/use-toast"

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
      t.archiveNo?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return {
      pending: filter(tasks.pending),
      closed: filter(tasks.closed)
    }
  }, [tasks, searchTerm])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">体检重要异常结果随访</h1>
          <p className="text-muted-foreground font-medium">中心 MySQL 驱动：基于任务池的闭环随访系统</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <Activity className={`size-4 ${isLoading ? 'animate-spin' : ''}`} /> 刷新任务
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案编号..." 
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

        <TabsContent value="pending" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto mb-2 text-primary" /> 检索待随访任务...</div>
          ) : filteredTasks.pending.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-xl border border-dashed border-muted-foreground/30 text-muted-foreground">
              <CalendarCheck2 className="size-12 mx-auto mb-4 opacity-20" />
              目前暂无需要跟进的待随访任务
            </div>
          ) : filteredTasks.pending.map((task: any) => (
            <Card key={task.anomalyId} className="border-l-4 border-l-amber-500 bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{task.patientName}</h3>
                    <Badge variant="outline" className="bg-muted/50">{task.patientGender} / {task.patientAge}岁</Badge>
                    <Badge variant={task.anomalyCategory === 'A' ? 'destructive' : 'secondary'}>{task.anomalyCategory}类异常</Badge>
                    <Badge className="bg-amber-100 text-amber-700 font-bold border-amber-200">
                      <Clock className="size-3 mr-1" /> 应随访日期: {task.nextFollowUpDate}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-[10px]">
                    <div><p className="text-muted-foreground uppercase font-bold">档案号</p><p className="font-mono text-primary">{task.archiveNo}</p></div>
                    <div><p className="text-muted-foreground uppercase font-bold">体检号</p><p className="font-mono">{task.checkupNumber}</p></div>
                    <div><p className="text-muted-foreground uppercase font-bold">联系电话</p><p className="font-bold">{task.patientPhone}</p></div>
                    <div><p className="text-muted-foreground uppercase font-bold">异常发现日期</p><p>{task.checkupDate}</p></div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-lg border border-muted/50">
                    <p className="text-[10px] text-muted-foreground font-bold mb-1">异常发现详情</p>
                    <p className="text-xs line-clamp-2">{task.anomalyDetails}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button asChild className="bg-primary hover:bg-primary/90 shadow-md">
                    <Link href={`/follow-ups/${task.anomalyId}/record`}>录入随访结果 <ChevronRight className="size-4 ml-1" /></Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/patients/${task.archiveNo}`}>查看病历全轴</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="closed" className="mt-6 space-y-4">
          {filteredTasks.closed.map((task: any) => (
            <Card key={task.anomalyId} className="border-l-4 border-l-green-500 bg-white opacity-80 hover:opacity-100 transition-opacity">
              <CardContent className="p-6 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{task.patientName}</h3>
                    {task.patientStatus === '死亡' ? (
                      <Badge variant="destructive" className="animate-pulse">患者已故 (自动结案)</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-green-200">已结案</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">档案号: {task.archiveNo}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-6 pt-2">
                    <div><p className="text-[10px] text-muted-foreground font-bold">最后随访日期</p><p className="text-sm">{task.followUpDate || '无'}</p></div>
                    <div><p className="text-[10px] text-muted-foreground font-bold">随访人</p><p className="text-sm">{task.followUpPerson || '未记录'}</p></div>
                    <div><p className="text-[10px] text-muted-foreground font-bold">随访结果</p><p className="text-sm line-clamp-1">{task.followUpResult || '无'}</p></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" asChild title="查看病历"><Link href={`/patients/${task.archiveNo}`}><History className="size-4" /></Link></Button>
                  <Button variant="ghost" size="icon" title="查看异常详情" onClick={() => toast({ title: "异常详情", description: task.anomalyDetails })}><AlertCircle className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTasks.closed.length === 0 && !isLoading && (
            <div className="py-20 text-center text-muted-foreground">暂无历史结案任务</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
