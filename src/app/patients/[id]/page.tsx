
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
  MoreVertical,
  Trash2,
  AlertCircle,
  MapPin,
  Phone,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { FollowUpForm } from "@/components/forms/FollowUpForm"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { fetchPatientFullTimeline, deleteAnomalyRecord } from "@/app/actions/mysql-sync"

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const id = params.id as string
  const [data, setData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isFollowUpOpen, setIsFollowUpOpen] = React.useState(false)
  const [recordToDelete, setRecordToDelete] = React.useState<any>(null)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      const result = await fetchPatientFullTimeline(config, id)
      setData(result)
    } catch (err: any) {
      toast({ variant: "destructive", title: "档案加载失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenPACS = () => {
    const pacsBase = "http://172.16.201.61:7242/?ChtId="
    window.open(`${pacsBase}${id}`, '_blank')
    toast({ title: "外呼PACS", description: `调取档案号: ${id}` })
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      await deleteAnomalyRecord(config, recordToDelete.id)
      toast({ title: "记录已删除", variant: "destructive" })
      loadData()
    } finally {
      setRecordToDelete(null)
    }
  }

  if (isLoading && !data) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>
  }

  const { patient, timeline, pdfs } = data || {}

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-5" /></Button>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            个人档案病历系统
            <Badge variant="secondary" className="bg-primary/10 text-primary">档案编号: {id}</Badge>
          </h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={handleOpenPACS}>
            <ExternalLink className="size-4" /> PACS调用
          </Button>
          
          <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-amber-500 hover:bg-amber-600"><PlusCircle className="size-4" /> 新增随访</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>录入随访记录 - {patient?.name}</DialogTitle></DialogHeader>
              <FollowUpForm 
                archiveNo={id} 
                patientName={patient?.name} 
                anomalyRecordId={timeline.find((r: any) => r.type === 'abnormal')?.id || ""}
                onSuccess={() => { setIsFollowUpOpen(false); loadData(); }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {patient?.status === '死亡' && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="size-4" />
          <AlertTitle>临床结案提示</AlertTitle>
          <AlertDescription>该患者已标记为“死亡”，后续随访任务已永久终止。</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md border-none overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8">
              <div className="flex flex-col items-center">
                <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-white shadow-sm">
                  <User className="size-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{patient?.name || "未补录"}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{patient?.gender} / {patient?.age}岁</Badge>
                  <Badge className={patient?.status === '正常' ? 'bg-green-500' : 'bg-red-500'}>{patient?.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-muted-foreground mt-1" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">住址</p><p className="text-sm">{patient?.address || "未登记"}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="size-4 text-muted-foreground mt-1" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">单位</p><p className="text-sm">{patient?.organization || "未登记"}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="size-4 text-muted-foreground mt-1" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">电话</p><p className="text-sm">{patient?.phoneNumber || "未登记"}</p></div>
                </div>
              </div>
              <Separator />
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed font-bold italic">
                  档案中心性标识：{id} > 身份证号
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="timeline">
            <TabsList className="w-full justify-start h-12 bg-white border-b rounded-none px-0 gap-8">
              <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full text-base gap-2">
                <History className="size-4" /> 临床病程轴
              </TabsTrigger>
              <TabsTrigger value="pdfs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full text-base gap-2">
                <FileText className="size-4" /> 报告库 ({pdfs?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="mt-8">
              <div className="relative pl-8 ml-4 border-l-2 border-primary/10 space-y-10">
                {timeline.map((event: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[45px] top-0 size-8 rounded-full border-4 border-white shadow-md flex items-center justify-center ${
                      event.type === 'abnormal' ? 'bg-destructive' : 'bg-primary'
                    }`}>
                      {event.type === 'abnormal' ? <Stethoscope className="size-4 text-white" /> : <ClipboardCheck className="size-4 text-white" />}
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xl font-bold">{event.type === 'abnormal' ? '重要异常发现' : '临床随访反馈'}</h4>
                          <span className="text-xs text-muted-foreground font-mono">日期：{event.checkupDate || event.followUpDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.anomalyCategory && <Badge variant="destructive">{event.anomalyCategory}类</Badge>}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onSelect={() => setRecordToDelete(event)}><Trash2 className="size-4 mr-2" /> 删除记录</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-sm bg-muted/20 p-4 rounded-lg whitespace-pre-wrap">{event.anomalyDetails || event.followUpResult}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pdfs" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {pdfs.map((pdf: any) => (
                <Card key={pdf.id} className="hover:shadow-md">
                  <CardContent className="p-4 flex items-center gap-4">
                    <FileText className="size-8 text-primary opacity-50" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold truncate">{pdf.reportCategory}</p>
                      <p className="text-[10px] text-muted-foreground">{pdf.checkDate} • {pdf.fullPath}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => window.open(pdf.fullPath, '_blank')}><ExternalLink className="size-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除？</AlertDialogTitle><AlertDialogDescription>此操作将永久移除该条临床病程记录。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
