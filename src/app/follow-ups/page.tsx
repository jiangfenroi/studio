
"use client"

import * as React from "react"
import { 
  Search, 
  AlertTriangle,
  Activity,
  UserX,
  Calendar,
  ClipboardList,
  Clock,
  MoreVertical,
  Trash2,
  AlertCircle
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
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase"
import { collectionGroup, query, collection, doc } from "firebase/firestore"
import { addDays, addYears, isAfter, parseISO, startOfDay, format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function FollowUpsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("pending")
  const [taskToDelete, setTaskToDelete] = React.useState<any | null>(null)

  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: allRecords, isLoading } = useCollection(recordsQuery)

  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients } = useCollection(patientsQuery)

  const tasks = React.useMemo(() => {
    if (!allRecords || !patients) return { pending: [], closed: [] }

    const today = startOfDay(new Date())
    
    // Original anomalies (those with categories)
    const anomalies = allRecords.filter(r => r.anomalyCategory) 
    // Professional follow-ups (those linked to an anomaly)
    const followUps = allRecords.filter(r => r.associatedAnomalyId)

    const processed = anomalies.map(anomaly => {
      const patient = patients.find(p => p.id === anomaly.patientProfileId)
      const history = followUps.filter(f => f.associatedAnomalyId === anomaly.id)
      
      const notificationDate = anomaly.notificationDate ? parseISO(anomaly.notificationDate) : null
      const examDate = anomaly.checkupDate ? parseISO(anomaly.checkupDate) : null
      const nextDate = anomaly.nextFollowUpDate ? parseISO(anomaly.nextFollowUpDate) : null
      
      // Rule: 7 days after notification
      const isSevenDaysPassed = notificationDate ? isAfter(today, addDays(notificationDate, 7)) : false
      // Rule: 1 year after examination
      const isOneYearPassed = examDate ? isAfter(today, addYears(examDate, 1)) : false
      // Rule: Manual next date reached
      const isNextDateReached = nextDate ? (isAfter(today, nextDate) || format(today, 'yyyy-MM-dd') === format(nextDate, 'yyyy-MM-dd')) : false

      // Check if any professional follow-up exists (excluding initial registration)
      const hasProfessionalFollowUp = history.length > 0
      
      let isTaskPending = false
      let reason = ""

      // Logic: If not explicitly closed and patient is alive
      if (!anomaly.isClosed && patient?.status !== '死亡') {
        if (isOneYearPassed) {
          isTaskPending = true
          reason = "年度定期随访"
        } else if (isNextDateReached) {
          isTaskPending = true
          reason = "预约随访期至"
        } else if (isSevenDaysPassed && !hasProfessionalFollowUp) {
          isTaskPending = true
          reason = "通知超期未随访 (7日)"
        }
      }

      return {
        ...anomaly,
        patient,
        isTaskPending,
        pendingReason: reason,
        historyCount: history.length,
        lastFollowUp: history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      }
    })

    const filtered = processed.filter(t => 
      t.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.archiveNo?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return {
      pending: filtered.filter(t => t.isTaskPending),
      closed: filtered.filter(t => !t.isTaskPending || t.isClosed || t.patient?.status === '死亡')
    }
  }, [allRecords, patients, searchTerm])

  const confirmWithdrawTask = () => {
    if (!taskToDelete) return
    const recordRef = doc(db, "patientProfiles", taskToDelete.patientProfileId, "medicalAnomalyRecords", taskToDelete.id)
    deleteDocumentNonBlocking(recordRef)
    setTaskToDelete(null)
    toast({
      title: "任务已撤销",
      variant: "destructive",
      description: "关联的重要异常结果记录已从库中移除。"
    })
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-primary">随访任务管理</h1>
        <p className="text-muted-foreground">基于 7日通知窗口、年度周期及预约日期的自动触发系统</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索姓名、档案编号..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12">
          <TabsTrigger value="pending" className="flex gap-2 text-base">
            待随访
            <Badge className="ml-1 bg-destructive" variant="destructive">{tasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-base">
            已结案/终止
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {tasks.pending.map((task) => (
            <Card key={task.id} className="border-l-4 border-l-amber-500 bg-white hover:shadow-md transition-shadow relative group">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.patient?.name || "未补录"}</h3>
                      <Badge variant="outline">{task.patient?.gender || '-'} / {task.patient?.age || '--'}岁</Badge>
                      <Badge className="bg-amber-100 text-amber-700">
                        <Clock className="size-3 mr-1" />
                        {task.pendingReason}
                      </Badge>
                      <Badge variant={task.anomalyCategory === 'A' ? 'destructive' : 'secondary'}>
                        {task.anomalyCategory}类异常
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">档案/体检号</p>
                        <p className="font-mono">{task.archiveNo}<br/><span className="text-muted-foreground">{task.checkupNumber}</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">联系电话</p>
                        <p>{task.patient?.phoneNumber || "未登记"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">异常发现与反馈</p>
                        <p className="line-clamp-2 text-xs">
                          <span className="font-bold text-destructive">详情：</span>{task.anomalyDetails}<br/>
                          <span className="font-bold text-primary">反馈：</span>{task.notifiedPersonFeedback || "无"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6 min-w-[140px]">
                    <Button asChild className="gap-2 bg-primary hover:bg-primary/90">
                      <Link href={`/follow-ups/${task.id}/record`}>录入随访</Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <MoreVertical className="size-4" />
                          更多
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/patients/${task.archiveNo}`} className="cursor-pointer">
                            <ClipboardList className="size-4 mr-2" /> 档案详情
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => setTaskToDelete(task)}>
                          <Trash2 className="size-4 mr-2" /> 撤销登记
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks.pending.length === 0 && !isLoading && (
            <div className="py-24 text-center border-dashed border-2 rounded-xl bg-muted/20">
              <Activity className="size-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">目前无待处理的临床随访任务</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6 space-y-4">
          {tasks.closed.map((task) => (
            <Card key={task.id} className="border-l-4 border-l-green-500 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.patient?.name || "未知"}</h3>
                      {task.patient?.status === '死亡' ? (
                        <Badge variant="destructive" className="gap-1">
                          <UserX className="size-3" /> 患者已故 (自动终止)
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">已结案/历史记录</Badge>
                      )}
                      <Badge variant="outline">ID: {task.archiveNo}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      体检日期: {task.checkupDate} • 
                      最近随访: {task.lastFollowUpAt ? format(parseISO(task.lastFollowUpAt), 'yyyy-MM-dd') : '无'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" asChild className="gap-2">
                      <Link href={`/patients/${task.archiveNo}`}>
                        <ClipboardList className="size-4" />
                        查看病历
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onSelect={() => setTaskToDelete(task)}>
                          <Trash2 className="size-4 mr-2" /> 撤销登记
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              确认撤销此任务？
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除档案号为 <span className="font-bold text-foreground">[{taskToDelete?.archiveNo}]</span> 的重要异常结果记录及其所有随访历史。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdrawTask} className="bg-destructive hover:bg-destructive/90">确认撤销</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
