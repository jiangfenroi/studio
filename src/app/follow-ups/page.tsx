
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Calendar,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  History
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, query } from "firebase/firestore"
import { format, addDays, addYears, isAfter, parseISO, startOfDay } from "date-fns"

export default function FollowUpsPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("pending")

  // Fetch all anomaly records and follow-ups across patients
  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: allRecords, isLoading } = useCollection(recordsQuery)

  // Fetch all patients for profile filtering
  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients } = useCollection(patientsQuery)

  const tasks = React.useMemo(() => {
    if (!allRecords || !patients) return { pending: [], closed: [] }

    const today = startOfDay(new Date())

    // Separate main anomaly records from follow-up history records
    // In our system, follow-up records have 'associatedAnomalyId' or 'isFollowUp' flag
    const anomalies = allRecords.filter(r => r.category) // Records with Category A/B are the "Main" tasks
    const followUps = allRecords.filter(r => r.associatedAnomalyId) // Records with this are history items

    const processed = anomalies.map(anomaly => {
      const patient = patients.find(p => p.id === anomaly.patientProfileId)
      const history = followUps.filter(f => f.associatedAnomalyId === anomaly.id)
      
      // Clinical Logic Calculation:
      const noticeDate = anomaly.noticeDate ? parseISO(anomaly.noticeDate) : null
      const examDate = anomaly.examDate ? parseISO(anomaly.examDate) : null
      const nextDate = anomaly.nextFollowUpDate ? parseISO(anomaly.nextFollowUpDate) : null
      
      // Rule 1: 7 days after notification
      const isSevenDaysPassed = noticeDate ? isAfter(today, addDays(noticeDate, 7)) : false
      
      // Rule 2: 1 year after examination
      const isOneYearPassed = examDate ? isAfter(today, addYears(examDate, 1)) : false
      
      // Rule 3: Reached manual next follow-up date
      const isNextDateReached = nextDate ? isAfter(today, nextDate) : false

      // Task is "Pending" if:
      // It's not closed AND (7 days passed with no history OR 1 year passed OR manual date reached)
      const hasProfessionalFollowUp = history.length > 0
      
      let isTaskPending = false
      let reason = ""

      if (!anomaly.isNotified) { // isNotified: true means CLOSED in our system logic
        if (isOneYearPassed) {
          isTaskPending = true
          reason = "年度定期随访"
        } else if (isNextDateReached) {
          isTaskPending = true
          reason = "预约随访期至"
        } else if (isSevenDaysPassed && !hasProfessionalFollowUp) {
          isTaskPending = true
          reason = "超期未随访 (7日)"
        }
      }

      return {
        ...anomaly,
        patient,
        isTaskPending,
        pendingReason: reason,
        historyCount: history.length
      }
    })

    const filtered = processed.filter(t => 
      t.notifiedPerson?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.archiveNo?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return {
      pending: filtered.filter(t => t.isTaskPending && t.patient?.status !== '死亡'),
      closed: filtered.filter(t => t.isNotified || t.patient?.status === '死亡')
    }
  }, [allRecords, patients, searchTerm])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">随访管理</h1>
          <p className="text-muted-foreground">根据通知日期及复查周期自动生成的随访任务</p>
        </div>
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
        <Button variant="secondary" className="gap-2 h-11">
          <Filter className="size-4" />
          过滤条件
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12">
          <TabsTrigger value="pending" className="flex gap-2 text-base">
            <Clock className="size-4" />
            待随访
            <Badge className="ml-1 bg-destructive" variant="destructive">{tasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-base">
            <CheckCircle2 className="size-4" />
            已结案
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {tasks.pending.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-all border-l-4 border-l-amber-500 bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.notifiedPerson}</h3>
                      <Badge variant="outline">{task.patient?.gender} / {task.patient?.age}岁</Badge>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                        <AlertTriangle className="size-3 mr-1" />
                        {task.pendingReason}
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">档案: {task.archiveNo}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground flex items-center gap-2 uppercase text-[10px] font-bold">体检详情</p>
                        <p className="font-medium">体检日期: {task.examDate}</p>
                        <p className="text-muted-foreground line-clamp-1">{task.details}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground flex items-center gap-2 uppercase text-[10px] font-bold">处置意见</p>
                        <p className="text-foreground line-clamp-2">{task.disposalAdvice}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6 min-w-[140px]">
                    <Button asChild className="gap-2">
                      <Link href={`/follow-ups/${task.id}/record`}>
                        录入随访
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="gap-2">
                      <Link href={`/patients/${task.archiveNo}`}>
                        查看档案
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks.pending.length === 0 && !isLoading && (
            <div className="py-20 text-center bg-muted/20 rounded-xl border-dashed border-2">
              <ClipboardList className="size-12 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">目前没有满足随访条件的待办任务</p>
              <p className="text-xs text-muted-foreground mt-1">系统将根据通知日期自动在7日后或预约周期到达后提醒您</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6 space-y-4">
          {tasks.closed.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 bg-green-50/10">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.notifiedPerson}</h3>
                      <Badge className="bg-green-100 text-green-700">已结案</Badge>
                      {task.patient?.status === '死亡' && <Badge variant="destructive">患者已故</Badge>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                        <History className="size-3" />
                        历史记录: {task.historyCount}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">原始异常: {task.details}</p>
                  </div>
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6">
                    <Button variant="outline" asChild className="gap-2">
                      <Link href={`/patients/${task.archiveNo}`}>查看病程</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks.closed.length === 0 && !isLoading && (
            <div className="py-20 text-center text-muted-foreground">
              暂无已结案记录
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
