
"use client"

import * as React from "react"
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Plus,
  Activity,
  Loader2,
  User,
  AlertTriangle,
  RefreshCcw,
  Trash2,
  Edit,
  ClipboardCheck,
  MessageSquare,
  ShieldCheck,
  FileText,
  Link as LinkIcon
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AbnormalResultForm } from "@/components/forms/AbnormalResultForm"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { fetchAllRecords, deleteAnomalyRecord } from "@/app/actions/mysql-sync"

export default function RecordsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [records, setRecords] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null)
  const [editingRecord, setEditingRecord] = React.useState<any | null>(null)
  const [recordToDelete, setRecordToDelete] = React.useState<any | null>(null)

  const loadRecords = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const configString = sessionStorage.getItem('mysql_config')
      if (!configString) throw new Error('数据库配置缺失')
      const config = JSON.parse(configString)
      const data = await fetchAllRecords(config)
      setRecords(data)
    } catch (err: any) {
      toast({ variant: "destructive", title: "检索失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => 
      (r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.archiveNo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.checkupNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.patientIdNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [records, searchTerm])

  const handleDelete = async () => {
    if (!recordToDelete) return
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      await deleteAnomalyRecord(config, recordToDelete.id)
      toast({ title: "已删除", description: "该条记录及关联的待随访任务已移除。" })
      loadRecords()
    } catch (err: any) {
      toast({ variant: "destructive", title: "删除失败", description: err.message })
    } finally {
      setRecordToDelete(null)
    }
  }

  const handleEditSuccess = () => {
    setEditingRecord(null)
    loadRecords()
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">重要异常结果记录展示</h1>
          <p className="text-muted-foreground">按照通知日期倒序展示 (Latest First) • 支持补录个人档案信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRecords} disabled={isLoading} className="gap-2">
            <RefreshCcw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} /> 同步刷新
          </Button>
          <Button asChild className="shadow-md bg-primary hover:bg-primary/90">
            <Link href="/records/new"><Plus className="size-4 mr-2" /> 新增登记</Link>
          </Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案号、体检号、身份证..." 
          className="pl-10 h-11 bg-white" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin mx-auto mb-2 text-primary" /> 检索数据库中...</TableCell></TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground">暂无符合条件的异常记录</TableCell></TableRow>
              ) : filteredRecords.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/5 group">
                  <TableCell>
                    <div className="text-sm font-bold">{r.notificationDate}</div>
                    <div className="text-[10px] text-muted-foreground">{r.notificationTime}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{r.patientName || "待补录"}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">NO: {r.archiveNo}</span>
                      {r.patientName && (
                        <span className="text-[10px] text-muted-foreground">
                          {r.patientGender} / {r.patientAge}岁 / {r.patientPhone}
                        </span>
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
                    <Badge variant={r.isFollowUpRequired ? 'default' : 'outline'} className={r.isFollowUpRequired ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                      {r.isFollowUpRequired ? '已随访' : '未随访'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" title="查看详情" onClick={() => setSelectedRecord(r)}>
                        <Eye className="size-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" title="修改信息" onClick={() => setEditingRecord(r)}>
                        <Edit className="size-4 text-amber-600" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/patients/${r.archiveNo}`}><Activity className="size-4 mr-2" /> 查看完整病历轴</Link></DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setRecordToDelete(r)}><Trash2 className="size-4 mr-2" /> 撤销登记</DropdownMenuItem>
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

      <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5" />
              重要异常结果 - 详细临床档案预览
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-0">
            <div className="p-8 space-y-8">
              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-primary border-b pb-2">
                  <User className="size-5" /> 患者基础档案
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">姓名</p>
                    <p className="font-bold text-base">{selectedRecord?.patientName || "待补录"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">档案编号</p>
                    <p className="font-mono font-bold">{selectedRecord?.archiveNo}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">性别 / 年龄</p>
                    <p>{selectedRecord?.patientGender || "-"} / {selectedRecord?.patientAge || "-"} 岁</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">身份证号</p>
                    <p className="font-mono">{selectedRecord?.patientIdNumber || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">联系电话</p>
                    <p className="font-mono">{selectedRecord?.patientPhone || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">档案状态</p>
                    <Badge variant={selectedRecord?.patientStatus === '正常' ? 'default' : 'destructive'}>
                      {selectedRecord?.patientStatus || "未知"}
                    </Badge>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-destructive border-b pb-2">
                  <Activity className="size-5" /> 临床异常发现
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">体检编号</p>
                    <p className="font-mono">{selectedRecord?.checkupNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">体检日期</p>
                    <p>{selectedRecord?.checkupDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">异常类别</p>
                    <Badge variant={selectedRecord?.anomalyCategory === 'A' ? 'destructive' : 'secondary'} className="font-bold">
                      {selectedRecord?.anomalyCategory}类异常
                    </Badge>
                  </div>
                  <div className="col-span-full space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">医学异常详情描述</p>
                    <div className="p-4 bg-red-50/50 border border-red-100 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedRecord?.anomalyDetails}
                    </div>
                  </div>
                  <div className="col-span-full space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">临床处置意见</p>
                    <div className="p-4 bg-muted/30 border rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedRecord?.disposalSuggestions || "暂无记录"}
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-amber-600 border-b pb-2">
                  <MessageSquare className="size-5" /> 告知与反馈信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">通知人 (医生/护士)</p>
                    <p className="font-medium">{selectedRecord?.notifier}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">被通知人 (患者/家属)</p>
                    <p className="font-medium">{selectedRecord?.notifiedPerson}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">通知具体时间</p>
                    <p>{selectedRecord?.notificationDate} {selectedRecord?.notificationTime}</p>
                  </div>
                  <div className="col-span-full space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">被通知人反馈内容</p>
                    <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-lg text-sm leading-relaxed whitespace-pre-wrap italic">
                      {selectedRecord?.notifiedPersonFeedback || "未记录反馈"}
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4 pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-green-600 border-b pb-2">
                  <ShieldCheck className="size-5" /> 系统合规与归档
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="flex items-center gap-6 p-4 bg-muted/20 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className={`size-3 rounded-full ${selectedRecord?.isNotified ? 'bg-green-500' : 'bg-muted'}`} />
                      <span className="font-medium">通知状态: {selectedRecord?.isNotified ? '已告知' : '未告知'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`size-3 rounded-full ${selectedRecord?.isHealthEducationProvided ? 'bg-green-500' : 'bg-muted'}`} />
                      <span className="font-medium">健康宣教: {selectedRecord?.isHealthEducationProvided ? '已提供' : '未提供'}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="size-5 text-blue-600" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">原始 PDF 报告关联</p>
                        <p className="font-mono text-xs text-blue-700">
                          {selectedRecord?.pdfId ? `#${selectedRecord.pdfId}` : "尚未归档原始报告"}
                        </p>
                      </div>
                    </div>
                    {selectedRecord?.pdfId && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-blue-600" onClick={() => {
                        toast({ title: "关联报告 ID", description: `报告物理编号: ${selectedRecord.pdfId}` });
                      }}>
                        <LinkIcon className="size-3" />
                        详情
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(o) => !o && setEditingRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>修改重要异常结果记录</DialogTitle>
          </DialogHeader>
          <AbnormalResultForm 
            initialData={editingRecord} 
            onSuccess={handleEditSuccess} 
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!recordToDelete} onOpenChange={(o) => !o && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" /> 确认撤销登记？</AlertDialogTitle>
            <AlertDialogDescription>
              该操作将永久从中心 MySQL 数据库中移除此条异常记录及其关联的随访任务和随访历史。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">确认撤销</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
