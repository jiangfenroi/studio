
"use client"

import * as React from "react"
import { 
  Search, 
  Activity,
  UserX,
  ClipboardList,
  Clock,
  MoreVertical,
  Trash2,
  AlertCircle,
  Loader2
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
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { addDays, addYears, isAfter, parseISO, startOfDay, format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { fetchFollowUpTasks, syncAnomalyToMysql } from "@/app/actions/mysql-sync"

export default function FollowUpsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("pending")
  const [data, setData] = React.useState<any>({ records: [], followups: [] })
  const [isLoading, setIsLoading] = React.useState(true)
  const [taskToDelete, setTaskToDelete] = React.useState<any | null>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)

  const loadTasks = React.useCallback(async () => {
    if (!config?.mysql) return
    setIsLoading(true)
    try {
      const res = await fetchFollowUpTasks(config.mysql)
      setData(res)
    } finally {
      setIsLoading(false)
    }
  }, [config])

  React.useEffect(() => {
    if (config) loadTasks()
  }, [config, loadTasks])

  const tasks = React.useMemo(() => {
    const today = startOfDay(new Date())
    
    const processed = data.records.map((anomaly: any) => {
      const history = data.followups.filter((f: any) => f.associatedAnomalyId === anomaly.id)
      
      const notificationDate = anomaly.notificationDate ? parseISO(anomaly.notificationDate) : null
      const examDate = anomaly.checkupDate ? parseISO(anomaly.checkupDate) : null
      
      const isSevenDaysPassed = notificationDate ? isAfter(today, addDays(notificationDate, 7)) : false
      const isOneYearPassed = examDate ? isAfter(today, addYears(examDate, 1)) : false
      const hasProfessionalFollowUp = history.length > 0
      
      let isTaskPending = false
      let reason = ""

      if (!anomaly.isClosed && anomaly.patientStatus !== '死亡') {
        if (isOneYearPassed) {
          isTaskPending = true
          reason = "年度定期随访"
        } else if (isSevenDaysPassed && !hasProfessionalFollowUp) {
          isTaskPending = true
          reason = "通知超期未随访 (7日)"
        }
      }

      return {
        ...anomaly,
        isTaskPending,
        pendingReason: reason,
        historyCount: history.length,
        lastFollowUp: history[0]
      }
    })

    const filtered = processed.filter((t: any) => 
      t.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.patientProfileId?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return {
      pending: filtered.filter((t: any) => t.isTaskPending),
      closed: filtered.filter((t: any) => !t.isTaskPending || t.isClosed || t.patientStatus === '死亡')
    }
  }, [data, searchTerm])

  const confirmWithdrawTask = async () => {
    if (!taskToDelete || !config?.mysql) return
    try {
      await syncAnomalyToMysql(config.mysql, { id: taskToDelete.id }, 'DELETE')
      toast({ title: "任务已撤销", variant: "destructive" })
      loadTasks()
      setTaskToDelete(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "失败", description: err.message })
    }
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-primary">随访任务管理</h1>
        <p className="text-muted-foreground">纯 MySQL 驱动：基于临床周期自动触发的任务系统</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案编号..." 
          className="pl-10 h-11" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12">
          <TabsTrigger value="pending" className="flex gap-2 text-base">
            待随访 <Badge className="ml-1 bg-destructive" variant="destructive">{tasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-base">已结案/历史</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto mb-2" /> 加载任务中...</div>
          ) : tasks.pending.map((task: any) => (
            <Card key={task.id} className="border-l-4 border-l-amber-500 bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{task.patientName}</h3>
                    <Badge variant="outline">{task.patientGender} / {task.patientAge}岁</Badge>
                    <Badge className="bg-amber-100 text-amber-700"><Clock className="size-3 mr-1" />{task.pendingReason}</Badge>
                    <Badge variant={task.anomalyCategory === 'A' ? 'destructive' : 'secondary'}>{task.anomalyCategory}类</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div><p className="text-muted-foreground">档案号</p><p className="font-mono">{task.patientProfileId}</p></div>
                    <div><p className="text-muted-foreground">体检号</p><p className="font-mono">{task.checkupNumber}</p></div>
                    <div><p className="text-muted-foreground">联系电话</p><p>{task.patientPhone}</p></div>
                    <div><p className="text-muted-foreground">发现日期</p><p>{task.checkupDate}</p></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild className="bg-primary"><Link href={`/follow-ups/${task.id}/record`}>录入随访</Link></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/patients/${task.patientProfileId}`}>档案详情</Link></DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => setTaskToDelete(task)}>撤销登记</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="closed" className="mt-6 space-y-4">
          {tasks.closed.map((task: any) => (
            <Card key={task.id} className="border-l-4 border-l-green-500 bg-white">
              <CardContent className="p-6 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{task.patientName}</h3>
                    {task.patientStatus === '死亡' ? <Badge variant="destructive">患者已故 (终止)</Badge> : <Badge className="bg-green-100 text-green-700">已结案</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">档案号: {task.patientProfileId} • 发现日期: {task.checkupDate}</p>
                </div>
                <Button variant="ghost" asChild><Link href={`/patients/${task.patientProfileId}`}>查看病历</Link></Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!taskToDelete} onOpenChange={(o) => !o && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认撤销？</AlertDialogTitle><AlertDialogDescription>此操作将永久删除该异常记录及所有历史随访。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={confirmWithdrawTask} className="bg-destructive">确认撤销</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
