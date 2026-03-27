
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
  Edit
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
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { fetchAllRecords, deleteAnomalyRecord } from "@/app/actions/mysql-sync"

/**
 * 重要异常结果展示 (功能二)
 * 按照通知日期倒序排列。
 * 展示：体检日期、档案编号、体检编号、姓名、性别、年龄、电话、详情、分类、意见、反馈、被通知人、通知人、时间、随访状态。
 */
export default function RecordsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [records, setRecords] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null)
  const [recordToDelete, setRecordToDelete] = React.useState<any | null>(null)

  const loadRecords = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (!config.host) throw new Error('数据库配置缺失')
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
                      {!r.patientName && (
                        <Button variant="ghost" size="icon" title="补录信息" asChild>
                          <Link href={`/patients/`}>
                            <User className="size-4 text-amber-600" />
                          </Link>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/patients/${r.archiveNo}`}><Activity className="size-4 mr-2" /> 查看完整病历轴</Link></DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setSelectedRecord(r)}><Edit className="size-4 mr-2" /> 修改结果信息</DropdownMenuItem>
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

      {/* 详细医学档案 Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 bg-primary text-white">
            <DialogTitle>详细临床档案预览 (MySQL 联表)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2"><User className="size-4" /> 患者基础档案 (SP_PERSON)</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">姓名</span><span className="font-bold">{selectedRecord?.patientName || "未补录"}</span>
                  <span className="text-muted-foreground">档案编号</span><span className="font-mono">{selectedRecord?.archiveNo}</span>
                  <span className="text-muted-foreground">性别/年龄</span><span>{selectedRecord?.patientGender || "-"} / {selectedRecord?.patientAge || "-"}岁</span>
                  <span className="text-muted-foreground">身份证号</span><span className="font-mono">{selectedRecord?.patientIdNumber || "-"}</span>
                  <span className="text-muted-foreground">联系电话</span><span>{selectedRecord?.patientPhone || "-"}</span>
                  <span className="text-muted-foreground">档案状态</span><Badge>{selectedRecord?.patientStatus || "未知"}</Badge>
                </div>
                {!selectedRecord?.patientName && (
                  <Button className="w-full gap-2 bg-amber-500 hover:bg-amber-600" asChild>
                    <Link href="/records/new">补录档案资料</Link>
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2 text-destructive"><Activity className="size-4" /> 临床异常发现 (SP_YCJG)</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">体检编号</span><span className="font-mono">{selectedRecord?.checkupNumber}</span>
                  <span className="text-muted-foreground">异常类别</span><Badge variant="destructive">{selectedRecord?.anomalyCategory}类</Badge>
                  <span className="text-muted-foreground">体检日期</span><span>{selectedRecord?.checkupDate}</span>
                  <span className="text-muted-foreground">告知日期</span><span>{selectedRecord?.notificationDate} {selectedRecord?.notificationTime}</span>
                  <span className="text-muted-foreground">健康宣教</span><span>{selectedRecord?.isHealthEducationProvided ? '已提供' : '未提供'}</span>
                  <div className="col-span-2 mt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">医学异常描述</p>
                    <p className="p-3 bg-muted/30 rounded text-xs leading-relaxed whitespace-pre-wrap">{selectedRecord?.anomalyDetails}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">临床处置意见</p>
                    <p className="p-3 bg-blue-50 border border-blue-100 rounded text-xs leading-relaxed whitespace-pre-wrap">{selectedRecord?.disposalSuggestions}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">被通知人反馈</p>
                    <p className="p-3 bg-amber-50 border border-amber-100 rounded text-xs leading-relaxed whitespace-pre-wrap">{selectedRecord?.notifiedPersonFeedback || "暂无反馈"}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!recordToDelete} onOpenChange={(o) => !o && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" /> 确认撤销登记？</AlertDialogTitle>
            <AlertDialogDescription>
              该操作将永久从中心 MySQL 数据库中移除此条异常记录及其关联的 **7 日随访任务**。
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
