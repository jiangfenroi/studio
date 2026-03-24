
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Clock,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  History,
  Activity,
  UserX
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

  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: allRecords, isLoading } = useCollection(recordsQuery)

  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients } = useCollection(patientsQuery)

  const tasks = React.useMemo(() => {
    if (!allRecords || !patients) return { pending: [], closed: [] }

    const today = startOfDay(new Date())
    const anomalies = allRecords.filter(r => r.anomalyCategory) 
    const followUps = allRecords.filter(r => r.associatedAnomalyId)

    const processed = anomalies.map(anomaly => {
      const patient = patients.find(p => p.id === anomaly.patientProfileId)
      const history = followUps.filter(f => f.associatedAnomalyId === anomaly.id)
      
      const notificationDate = anomaly.notificationDate ? parseISO(anomaly.notificationDate) : null
      const examDate = anomaly.examDate ? parseISO(anomaly.examDate) : null
      const nextDate = anomaly.nextFollowUpDate ? parseISO(anomaly.nextFollowUpDate) : null
      
      const isSevenDaysPassed = notificationDate ? isAfter(today, addDays(notificationDate, 7)) : false
      const isOneYearPassed = examDate ? isAfter(today, addYears(examDate, 1)) : false
      const isNextDateReached = nextDate ? isAfter(today, nextDate) : false

      const hasProfessionalFollowUp = history.length > 0
      
      let isTaskPending = false
      let reason = ""

      // Logic: If not closed, check if conditions are met to become pending
      if (!anomaly.isClosed && patient?.status !== '死亡') {
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
      pending: filtered.filter(t => t.isTaskPending),
      closed: filtered.filter(t => t.isClosed || t.patient?.status === '死亡')
    }
  }, [allRecords, patients, searchTerm])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-primary">随访管理</h1>
        <p className="text-muted-foreground">根据通知日期、复查周期及生命状态自动更新的任务清单</p>
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
            <Card key={task.id} className="border-l-4 border-l-amber-500 bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.notifiedPerson}</h3>
                      <Badge variant="outline">{task.patient?.gender} / {task.patient?.age}岁</Badge>
                      <Badge className="bg-amber-100 text-amber-700">
                        <AlertTriangle className="size-3 mr-1" />
                        {task.pendingReason}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">体检编号</p>
                        <p>{task.checkupNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">异常详情</p>
                        <p className="line-clamp-1">{task.anomalyDetails}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6 min-w-[140px]">
                    <Button asChild className="gap-2">
                      <Link href={`/follow-ups/${task.id}/record`}>录入随访</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/patients/${task.archiveNo}`}>病历档案</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks.pending.length === 0 && !isLoading && (
            <div className="py-20 text-center border-dashed border-2 rounded-xl">
              <Activity className="size-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">目前无待随访任务</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6 space-y-4">
          {tasks.closed.map((task) => (
            <Card key={task.id} className="border-l-4 border-l-green-500 bg-green-50/10">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.notifiedPerson}</h3>
                      {task.patient?.status === '死亡' ? (
                        <Badge variant="destructive" className="gap-1">
                          <UserX className="size-3" /> 患者已故 (自动结案)
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">已结案</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">档案号: {task.archiveNo}</p>
                  </div>
                  <Button variant="ghost" asChild>
                    <Link href={`/patients/${task.archiveNo}`}>查看归档</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
