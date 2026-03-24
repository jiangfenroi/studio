
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  ExternalLink, 
  History, 
  FileText,
  User,
  Building,
  Activity,
  BadgeCheck,
  Stethoscope,
  ClipboardCheck,
  PlusCircle,
  Clock,
  MoreVertical,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useDoc, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase"
import { doc, collection, query, orderBy } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FollowUpForm } from "@/components/forms/FollowUpForm"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const db = useFirestore()
  const { toast } = useToast()
  const [isFollowUpOpen, setIsFollowUpOpen] = React.useState(false)
  
  const id = params.id as string

  // Fetch Patient Profile
  const patientRef = useMemoFirebase(() => doc(db, "patientProfiles", id), [db, id])
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef)

  // Fetch All Records (Anomalies and Follow-ups)
  const recordsQuery = useMemoFirebase(() => 
    query(collection(db, "patientProfiles", id, "medicalAnomalyRecords"), orderBy("createdAt", "desc")), 
    [db, id]
  )
  const { data: allRecords, isLoading: isRecordsLoading } = useCollection(recordsQuery)

  // Fetch PACS config
  const configRef = useMemoFirebase(() => doc(db, 'systemConfig', 'default'), [db])
  const { data: config } = useDoc(configRef)

  // Synthesize Timeline
  const clinicalTimeline = React.useMemo(() => {
    if (!allRecords) return []
    return allRecords.map(record => ({
      ...record,
      type: record.category ? 'abnormal' : 'followup'
    }))
  }, [allRecords])

  const handleOpenPACS = () => {
    const pacsBase = config?.pacsUrlBase || "http://172.16.201.61:7242/?ChtId="
    const pacsUrl = `${pacsBase}${id}`
    window.open(pacsUrl, '_blank')
    toast({
      title: "正在外呼PACS系统",
      description: `档案号: ${id}。正在调用院内影像查看平台...`,
    })
  }

  const handleDeleteRecord = (recordId: string, type: string) => {
    if (confirm(`确定要删除这条${type === 'abnormal' ? '异常结果' : '随访'}记录吗？此操作不可撤销。`)) {
      const recordRef = doc(db, "patientProfiles", id, "medicalAnomalyRecords", recordId)
      deleteDocumentNonBlocking(recordRef)
      toast({
        title: "记录已删除",
        variant: "destructive"
      })
    }
  }

  if (isPatientLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="size-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">正在调取电子病历...</p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">未找到档案</h2>
        <Button onClick={() => router.back()} className="mt-4">返回列表</Button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              个人档案病历系统
              <Badge variant="secondary" className="bg-primary/10 text-primary">档案编号: {id}</Badge>
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={handleOpenPACS}>
            <ExternalLink className="size-4" />
            PACS调用
          </Button>
          
          <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-amber-500 hover:bg-amber-600">
                <PlusCircle className="size-4" />
                新增随访
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>录入随访记录 - {patient.name}</DialogTitle>
              </DialogHeader>
              <FollowUpForm 
                archiveNo={id} 
                patientName={patient.name} 
                anomalyRecordId={clinicalTimeline.find(r => r.type === 'abnormal')?.id || "unknown"}
                onSuccess={() => {
                  setIsFollowUpOpen(false)
                  toast({ title: "随访记录已保存" })
                }} 
              />
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2">
            <BadgeCheck className="size-4" />
            修改基本资料
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md border-none overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8">
              <div className="flex flex-col items-center">
                <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-white shadow-sm">
                  <User className="size-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{patient.name}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="bg-white">{patient.gender} / {patient.age}岁</Badge>
                  <Badge className={patient.status === '正常' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500'}>
                    {patient.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">身份证号</p>
                    <p className="text-sm font-mono">{patient.idNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="size-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">所属单位</p>
                    <p className="text-sm">{patient.organization || "个人档案"}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="size-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-900">临床摘要</span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  最后随访时间：{clinicalTimeline.find(r => r.type === 'followup')?.followUpDate || "无记录"}。PACS 路径已按照中心配置同步。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full justify-start h-12 bg-white border-b rounded-none px-0 gap-8">
              <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-base gap-2">
                <History className="size-4" />
                病程/随访时间轴
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-base gap-2">
                <FileText className="size-4" />
                关联报告库 (PDF)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="mt-8">
              {isRecordsLoading ? (
                <div className="flex justify-center py-10">
                  <Clock className="animate-spin size-6 text-muted-foreground" />
                </div>
              ) : (
                <div className="relative pl-8 ml-4 border-l-2 border-primary/10 space-y-10">
                  {clinicalTimeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[45px] top-0 size-8 rounded-full border-4 border-white shadow-md flex items-center justify-center ${
                        event.type === 'abnormal' ? 'bg-destructive' : 'bg-primary'
                      }`}>
                        {event.type === 'abnormal' ? <Stethoscope className="size-4 text-white" /> : <ClipboardCheck className="size-4 text-white" />}
                      </div>
                      <div className="bg-white p-5 rounded-xl shadow-sm border border-muted/50 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col gap-1">
                            <h4 className="text-xl font-bold text-foreground">
                              {event.type === 'abnormal' ? (event.details?.split('\n')[0] || '重要异常发现') : '随访反馈记录'}
                            </h4>
                            <span className="text-xs text-muted-foreground font-mono">
                              {event.examDate || event.followUpDate}
                            </span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive gap-2"
                                onSelect={() => handleDeleteRecord(event.id, event.type)}
                              >
                                <Trash2 className="size-4" />
                                删除此条记录
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                          {event.details || event.followUpResult}
                        </p>
                        {event.category && (
                          <Badge variant={event.category === 'A' ? 'destructive' : 'secondary'}>
                            {event.category}类异常
                          </Badge>
                        )}
                        {event.followUpPerson && (
                          <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground font-medium uppercase">
                            <User className="size-3" />
                            记录人: {event.followUpPerson || event.notifier}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {clinicalTimeline.length === 0 && (
                    <div className="text-center py-10 bg-muted/20 rounded-lg border-dashed border-2">
                      <p className="text-muted-foreground">暂无病程记录</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="col-span-full py-10 text-center text-muted-foreground">
                    <FileText className="size-12 mx-auto mb-4 opacity-20" />
                    <p>请点击相应病程记录查看详情以下载 PDF 报告</p>
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
