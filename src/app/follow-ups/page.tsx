
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Calendar,
  Phone,
  ClipboardList,
  CheckCircle2,
  Clock,
  MoreVertical,
  ArrowRight,
  User
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, query } from "firebase/firestore"

export default function FollowUpsPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")

  // Fetch all anomaly records across patients
  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: records, isLoading } = useCollection(recordsQuery)

  // Fetch all patients for profile filtering (like deceased status)
  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients } = useCollection(patientsQuery)

  // Filter pending vs closed
  const tasks = React.useMemo(() => {
    if (!records || !patients) return { pending: [], closed: [] }

    const all = records.map(r => ({
      ...r,
      patient: patients.find(p => p.id === r.patientProfileId)
    }))

    // Pending: category A/B, not notified, patient not deceased
    const pending = all.filter(t => 
      !t.isNotified && 
      t.patient?.status !== '死亡' &&
      (t.notifiedPerson?.includes(searchTerm) || t.archiveNo?.includes(searchTerm))
    )

    // Closed: notified OR patient deceased
    const closed = all.filter(t => 
      (t.isNotified || t.patient?.status === '死亡') &&
      (t.notifiedPerson?.includes(searchTerm) || t.archiveNo?.includes(searchTerm))
    )

    return { pending, closed }
  }, [records, patients, searchTerm])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">随访管理</h1>
          <p className="text-muted-foreground">管理待随访任务与已结案记录，确保护理闭环</p>
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

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12">
          <TabsTrigger value="pending" className="flex gap-2 text-base">
            <Clock className="size-4" />
            待随访
            <Badge className="ml-1 bg-destructive">{tasks.pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-base">
            <CheckCircle2 className="size-4" />
            已结案
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {tasks.pending.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.notifiedPerson}</h3>
                      <Badge variant="outline">{task.patient?.gender} / {task.patient?.age}岁</Badge>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">档案: {task.archiveNo}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-4" />
                        体检日期: <span className="text-foreground font-medium">{task.examDate}</span>
                      </div>
                      <div className="col-span-full mt-2 pt-2 border-t">
                        <p className="font-semibold text-primary mb-1">异常详情:</p>
                        <p className="text-muted-foreground line-clamp-2">{task.details}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6">
                    <Button asChild className="gap-2">
                      <Link href={`/follow-ups/${task.id}/record`}>
                        录入随访
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/patients/${task.archiveNo}`}>查看档案</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks.pending.length === 0 && !isLoading && (
            <div className="py-20 text-center bg-muted/20 rounded-xl border-dashed border-2">
              <ClipboardList className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">目前没有待随访的任务</p>
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
                    </div>
                    <p className="text-sm text-muted-foreground">{task.details}</p>
                  </div>
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6">
                    <Button variant="outline" asChild className="gap-2">
                      <Link href={`/patients/${task.archiveNo}`}>查看档案</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
