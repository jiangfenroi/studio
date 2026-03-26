
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
  AlertTriangle
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
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { fetchAllRecords, syncAnomalyToMysql } from "@/app/actions/mysql-sync"

/**
 * 重要异常结果管理
 * 全维度展示：SP_PERSON (档案、姓名、性别、年龄、身份证号、电话、状态) + SP_YCJG (全部字段)
 * 数据 100% 来源于 MySQL。
 */
export default function RecordsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [records, setRecords] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null)
  const [recordToDelete, setRecordToDelete] = React.useState<any | null>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)

  const loadRecords = React.useCallback(async () => {
    if (!config?.mysql) return
    setIsLoading(true)
    try {
      const data = await fetchAllRecords(config.mysql)
      setRecords(data)
    } finally {
      setIsLoading(false)
    }
  }, [config])

  React.useEffect(() => {
    if (config) loadRecords()
  }, [config, loadRecords])

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => 
      (r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.patientProfileId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.patientIdNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [records, searchTerm])

  const confirmDelete = async () => {
    if (!recordToDelete || !config?.mysql) return
    try {
      await syncAnomalyToMysql(config.mysql, { id: recordToDelete.id }, 'DELETE')
      toast({ title: "记录已撤销", variant: "destructive" })
      loadRecords()
    } catch (err) {
      toast({ title: "删除失败", variant: "destructive" })
    } finally {
      setRecordToDelete(null)
    }
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">重要异常结果管理</h1>
          <p className="text-muted-foreground">全维度联表预览：患者档案 (SP_PERSON) + 异常结果 (SP_YCJG)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRecords} disabled={isLoading}>
            <Activity className="size-4 mr-2" /> 同步数据
          </Button>
          <Button asChild className="shadow-md">
            <Link href="/records/new"><Plus className="size-4 mr-2" /> 新增登记</Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案号、身份证号、体检号..." 
          className="pl-10 h-11" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold">档案编号</TableHead>
              <TableHead className="font-bold">姓名</TableHead>
              <TableHead className="font-bold">性别/年龄</TableHead>
              <TableHead className="font-bold">身份证号</TableHead>
              <TableHead className="font-bold">联系电话</TableHead>
              <TableHead className="font-bold">档案状态</TableHead>
              <TableHead className="font-bold">异常详情 (SP_YCJG)</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /> 检索中...</TableCell></TableRow>
            ) : filteredRecords.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/5 group">
                <TableCell className="font-bold text-primary">{r.patientProfileId}</TableCell>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell>{r.patientGender} / {r.patientAge}岁</TableCell>
                <TableCell className="text-xs font-mono">{r.patientIdNumber}</TableCell>
                <TableCell className="text-xs">{r.patientPhone}</TableCell>
                <TableCell>
                  <Badge variant={r.patientStatus === '正常' ? 'default' : 'destructive'} className="text-[10px]">
                    {r.patientStatus}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[250px] truncate text-xs" title={r.anomalyDetails}>
                  {r.anomalyDetails}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(r)}><Eye className="size-4 text-primary" /></Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setSelectedRecord(r)}>查看详细医学档案</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => setRecordToDelete(r)}>撤销此条记录</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 bg-primary text-white">
            <DialogTitle>全维度临床档案预览 (MySQL 联表)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2"><User className="size-4" /> 患者基础档案 (SP_PERSON)</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">姓名</span><span>{selectedRecord?.patientName}</span>
                  <span className="text-muted-foreground">档案编号</span><span className="font-mono">{selectedRecord?.patientProfileId}</span>
                  <span className="text-muted-foreground">性别/年龄</span><span>{selectedRecord?.patientGender} / {selectedRecord?.patientAge}岁</span>
                  <span className="text-muted-foreground">身份证号</span><span className="font-mono">{selectedRecord?.patientIdNumber}</span>
                  <span className="text-muted-foreground">联系电话</span><span>{selectedRecord?.patientPhone}</span>
                  <span className="text-muted-foreground">档案状态</span><Badge>{selectedRecord?.patientStatus}</Badge>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2 text-destructive"><Activity className="size-4" /> 临床异常发现 (SP_YCJG)</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">体检编号</span><span className="font-mono">{selectedRecord?.checkupNumber}</span>
                  <span className="text-muted-foreground">异常类别</span><Badge variant="destructive">{selectedRecord?.anomalyCategory}类</Badge>
                  <span className="text-muted-foreground">体检日期</span><span>{selectedRecord?.checkupDate}</span>
                  <span className="text-muted-foreground">告知状态</span><span>{selectedRecord?.isNotified ? '已告知' : '未告知'}</span>
                  <div className="col-span-2 mt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">医学异常描述</p>
                    <p className="p-3 bg-muted/30 rounded text-xs leading-relaxed">{selectedRecord?.anomalyDetails}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">临床处置意见</p>
                    <p className="p-3 bg-blue-50 border border-blue-100 rounded text-xs leading-relaxed">{selectedRecord?.disposalSuggestions}</p>
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
            <AlertDialogDescription>该操作将永久从中心 MySQL 数据库中移除此条异常记录。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">确认撤销</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
