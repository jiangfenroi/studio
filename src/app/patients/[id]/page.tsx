
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
  PlusCircle,
  MoreVertical,
  Trash2,
  AlertCircle,
  MapPin,
  Phone,
  Loader2,
  Upload,
  Eye,
  Link as LinkIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { PdfUploadForm } from "@/components/forms/PdfUploadForm"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchPatientFullTimeline, deleteAnomalyRecord, deletePdfMetadata, deleteFollowUpRecord } from "@/app/actions/mysql-sync"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const id = params.id as string
  const [data, setData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isFollowUpOpen, setIsFollowUpOpen] = React.useState(false)
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)
  
  const [recordToDelete, setRecordToDelete] = React.useState<any>(null)
  const [pdfToDelete, setPdfToDelete] = React.useState<any>(null)

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
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    const pacsBase = config.pacsUrlBase || "http://172.16.201.61:7242/?ChtId="
    window.open(`${pacsBase}${id}`, '_blank')
    toast({ title: "调用 PACS", description: `检索档案号: ${id}` })
  }

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (recordToDelete.type === 'abnormal') {
        await deleteAnomalyRecord(config, recordToDelete.id)
        toast({ title: "异常结果已删除", description: "关联的随访记录和任务已同步移除。" })
      } else {
        await deleteFollowUpRecord(config, recordToDelete.id)
        toast({ title: "随访记录已删除" })
      }
      loadData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "删除失败", description: err.message })
    } finally {
      setRecordToDelete(null)
    }
  }

  const handleDeletePdf = async () => {
    if (!pdfToDelete) return
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      await deletePdfMetadata(config, pdfToDelete.id)
      toast({ title: "报告索引已移除", variant: "destructive" })
      loadData()
    } finally {
      setPdfToDelete(null)
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
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-primary flex items-center gap-3 leading-none">
              {patient?.name || "未补录"}
              <Badge variant="secondary" className="bg-primary/10 text-primary h-5 text-[10px] font-mono">ID: {id}</Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">全生命周期病历档案驱动</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 text-blue-700 border-blue-200" onClick={handleOpenPACS}>
            <ExternalLink className="size-4" /> PACS 联动
          </Button>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Upload className="size-4" /> 报告归档</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>上传并归档 PDF 报告 - {patient?.name}</DialogTitle></DialogHeader>
              <PdfUploadForm archiveNo={id} onSuccess={() => { setIsUploadOpen(false); loadData(); }} />
            </DialogContent>
          </Dialog>

          <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-md"><PlusCircle className="size-4" /> 录入随访</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>随访结果记录 - {patient?.name}</DialogTitle></DialogHeader>
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
          <AlertTitle>随访永久终止</AlertTitle>
          <AlertDescription>该患者已标记为“死亡”，后续临床任务已自动清理。</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md border-none overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8 text-center">
              <div className="flex flex-col items-center">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-2 ring-white shadow">
                  <User className="size-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{patient?.name || "未补录"}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] font-bold">{patient?.gender} / {patient?.age}岁</Badge>
                  <Badge className={cn("text-[10px] font-bold", patient?.status === '正常' ? 'bg-green-500' : 'bg-red-500')}>{patient?.status}</Badge>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-2 uppercase tracking-tighter">ARCHIVE NO: {id}</div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5 text-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3"><MapPin className="size-4 text-muted-foreground mt-1" /><p className="text-xs leading-relaxed">{patient?.address || "地址未登记"}</p></div>
                <div className="flex items-start gap-3"><Building className="size-4 text-muted-foreground mt-1" /><p className="text-xs leading-relaxed">{patient?.organization || "单位未登记"}</p></div>
                <div className="flex items-start gap-3"><Phone className="size-4 text-primary mt-1" /><p className="font-bold text-sm">{patient?.phoneNumber || "电话未登记"}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="timeline">
            <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none px-0 gap-8">
              <TabsTrigger value="timeline" className="rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary text-base gap-2"><History className="size-4" /> 临床病史轴</TabsTrigger>
              <TabsTrigger value="pdfs" className="rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary text-base gap-2"><FileText className="size-4" /> PDF 报告库 ({pdfs?.length || 0})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="mt-8">
              <div className="relative pl-8 ml-4 border-l-2 border-primary/10 space-y-10">
                {timeline.map((event: any, idx: number) => (
                  <div key={idx} className="relative group">
                    <div className={cn(
                      "absolute -left-[45px] top-0 size-8 rounded-full border-4 border-white shadow flex items-center justify-center z-10",
                      event.type === 'abnormal' ? (event.anomalyCategory === 'A' ? 'bg-destructive' : 'bg-primary') : 'bg-green-600'
                    )}>
                      {event.type === 'abnormal' ? <AlertCircle className="size-4 text-white" /> : <Activity className="size-4 text-white" />}
                    </div>
                    <div className="bg-white p-5 rounded-xl border shadow-sm group-hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-bold text-foreground">
                            {event.checkupDate || event.followUpDate}
                            <span className="text-[10px] font-mono text-muted-foreground ml-3 font-normal opacity-70">
                              {event.notificationTime || event.followUpTime}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-primary/80">{event.type === 'abnormal' ? '重要异常发现' : '临床随访结果'}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.anomalyCategory && (
                            <Badge className={cn(
                              "font-bold text-[10px] h-5",
                              event.anomalyCategory === 'A' ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
                            )}>
                              {event.anomalyCategory}类异常
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {event.type === 'abnormal' ? (
                                <DropdownMenuItem asChild>
                                  <Link href={`/records/${event.id}`} className="flex items-center">
                                    <Eye className="size-4 mr-2 text-primary" /> 查看及修改详情
                                  </Link>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem asChild>
                                  <Link href={`/follow-ups/detail/${event.id}`} className="flex items-center">
                                    <Eye className="size-4 mr-2 text-primary" /> 查看及修改详情
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onSelect={() => setRecordToDelete(event)}>
                                <Trash2 className="size-4 mr-2" /> 撤销记录
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-sm bg-muted/30 p-4 rounded-lg whitespace-pre-wrap leading-relaxed border-l-2 border-primary/20 shadow-inner">
                        {event.anomalyDetails || event.followUpResult}
                      </p>
                      
                      <div className="mt-3 flex justify-end">
                         <Button variant="link" size="sm" asChild className="text-[11px] text-muted-foreground hover:text-primary p-0 h-auto">
                            <Link href={event.type === 'abnormal' ? `/records/${event.id}` : `/follow-ups/detail/${event.id}`}>
                              详情追溯 <ExternalLink className="size-3 ml-1" />
                            </Link>
                         </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                   <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl flex flex-col items-center gap-3">
                     <History className="size-10 opacity-20" />
                     暂无临床病史记录
                   </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pdfs" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {pdfs.map((pdf: any) => (
                <Card key={pdf.id} className="hover:shadow-md transition-all group border-none shadow-sm ring-1 ring-border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="size-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold truncate">{pdf.reportCategory}</p>
                      <div className="text-[10px] font-bold text-foreground mt-0.5">{pdf.checkDate}</div>
                      <p className="text-[9px] text-muted-foreground truncate opacity-50 mt-1" title={pdf.fullPath}>{pdf.fullPath}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toast({ title: "内网访问路径", description: pdf.fullPath })} title="查看路径"><LinkIcon className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setPdfToDelete(pdf)} title="删除索引"><Trash2 className="size-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pdfs.length === 0 && <div className="col-span-full py-24 text-center text-muted-foreground border-2 border-dashed rounded-xl flex flex-col items-center gap-3"><FileText className="size-10 opacity-20" /> 暂无归档 PDF 报告</div>}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={!!recordToDelete} onOpenChange={(o) => !o && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认撤销此条临床记录？</AlertDialogTitle>
            <AlertDialogDescription>
              {recordToDelete?.type === 'abnormal' 
                ? "此操作将永久移除异常发现及其关联的所有随访任务和历史，不可撤销。" 
                : "此操作将从数据库中永久移除该条随访结果。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive">确认撤销</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pdfToDelete} onOpenChange={() => setPdfToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除报告索引？</AlertDialogTitle><AlertDialogDescription>此操作将从数据库中移除文件索引。请确保您已手动清理内网物理存储中的文件。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handleDeletePdf} className="bg-destructive">确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
