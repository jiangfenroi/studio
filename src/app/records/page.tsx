
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
  Link as LinkIcon,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Phone
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
import { fetchAllRecords, deleteAnomalyRecord, bulkImportAnomalyRecords } from "@/app/actions/mysql-sync"
import { cn } from "@/lib/utils"

export default function RecordsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [records, setRecords] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isImporting, setIsImporting] = React.useState(false)
  const [recordToDelete, setRecordToDelete] = React.useState<any | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        
        if (lines.length <= 1) {
          toast({ variant: "destructive", title: "文件无效", description: "CSV 文件中没有数据行或编码错误。" });
          setIsLoading(false);
          return;
        }

        const recordsToImport = lines.slice(1).map(line => {
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          return {
            archiveNo: cols[0],
            checkupNumber: cols[1],
            checkupDate: cols[2],
            anomalyCategory: (cols[3] || 'A') as 'A' | 'B',
            anomalyDetails: cols[4],
            notificationDate: cols[5],
            notificationTime: cols[6],
            isNotified: cols[7] === '是' || cols[7] === '1' || cols[7] === 'true',
            isHealthEducationProvided: cols[8] === '是' || cols[8] === '1' || cols[8] === '' || cols[8] === 'true',
            notifier: cols[9],
            notifiedPerson: cols[10],
            disposalSuggestions: cols[11],
            notifiedPersonFeedback: cols[12] || ""
          }
        }).filter(r => r.archiveNo)

        const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
        const res = await bulkImportAnomalyRecords(config, recordsToImport)
        toast({ title: "批量导入成功", description: `已成功导入 ${res.count} 条记录。` })
        loadRecords()
      } catch (err: any) {
        toast({ variant: "destructive", title: "导入解析失败", description: "请确保文件保存为 'CSV UTF-8' 格式。" })
      } finally {
        setIsLoading(false)
        setIsImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const downloadTemplate = () => {
    const headers = "档案编号(必填),体检编号(必填),体检日期(必填),种类(必填:A/B),异常详情(必填),通知日期(必填),通知时间(必填),是否告知(必填:是/否),是否宣教(选填:是/否),通知人(必填),被通知人(必填),处置意见(必填),被通知人反馈(选填)"
    const example = "D0001,202501010001,2025-01-01,A,肺结节(10mm),2025-01-02,09:30,是,是,张医生,患者本人,建议临床复查,已知晓"
    const blob = new Blob(["\ufeff" + headers + "\n" + example], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "重要异常结果批量导入模板.csv"
    link.click()
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">重要异常结果记录</h1>
          <p className="text-muted-foreground">内网核心驱动 • 支持 CSV 批量同步</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImporting(true)} className="gap-2 bg-green-50 text-green-700 border-green-200">
            <Upload className="size-4" /> 批量导入
          </Button>
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
          placeholder="搜索姓名、档案号、体检号..." 
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
                <TableHead>患者姓名</TableHead>
                <TableHead>档案信息</TableHead>
                <TableHead>体检编号/日期</TableHead>
                <TableHead className="max-w-[400px]">结果详情/分类</TableHead>
                <TableHead>告知人/被通知人</TableHead>
                <TableHead>随访状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin mx-auto mb-2 text-primary" /> 正在处理临床数据...</TableCell></TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground">暂无符合条件的异常记录</TableCell></TableRow>
              ) : filteredRecords.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/5 group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground text-lg">{r.patientName || "待补录"}</span>
                      {r.patientName && (
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {r.patientGender} / {r.patientAge}岁
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                      {r.archiveNo}
                    </span>
                    <div className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-1.5">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span className="font-mono tracking-tighter">{r.patientPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-mono">{r.checkupNumber}</div>
                    <div className="text-[10px] text-muted-foreground">体检: {r.checkupDate}</div>
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Badge variant={r.anomalyCategory === 'A' ? 'destructive' : 'default'} className={cn(
                          "h-4 text-[8px] px-1",
                          r.anomalyCategory === 'B' && "bg-primary hover:bg-primary/90"
                        )}>
                          {r.anomalyCategory}类
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed truncate" title={r.anomalyDetails}>{r.anomalyDetails}</p>
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
                      <Button variant="ghost" size="icon" asChild title="查看详情">
                        <Link href={`/records/${r.id}`}><Eye className="size-4 text-primary" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="修改信息">
                        <Link href={`/records/${r.id}`}><Edit className="size-4 text-primary" /></Link>
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

      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /> 批量导入异常结果</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-3">
              <p className="font-bold text-primary flex items-center gap-2">
                <FileText className="size-3" /> 字段填写指引：
              </p>
              <ScrollArea className="h-40 pr-3">
                <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                  <div className="p-2 bg-red-100/50 rounded border border-red-200">
                    <p className="font-bold text-destructive mb-1 flex items-center gap-1">
                      <AlertCircle className="size-3" /> 乱码解决提示：
                    </p>
                    <p className="text-[10px] leading-relaxed text-destructive/80">
                      如果您使用 WPS 或 Excel 编辑后出现乱码，请在保存时选择文件类型为：<span className="font-black">“CSV UTF-8 (逗号分隔) (*.csv)”</span>。
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p><span className="font-bold text-destructive">必填项：</span>档案编号, 体检编号, 体检日期, 种类(A/B), 详情, 通知日期/时间, 告知/被告知人, 处置意见</p>
                  </div>
                </div>
              </ScrollArea>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full gap-2 border-dashed h-12" onClick={downloadTemplate}>
                <Download className="size-4" /> 下载标准导入模板 (.csv)
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleCsvImport} className="hidden" accept=".csv" />
              <Button className="w-full h-12 gap-2 bg-primary shadow-lg" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" /> 选择并上传填写好的文件
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!recordToDelete} onOpenChange={(o) => !o && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" /> 确认撤销登记？</AlertDialogTitle>
            <AlertDialogDescription>该操作将永久从中心 MySQL 数据库中移除此条记录及其关联任务。</AlertDialogDescription>
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
