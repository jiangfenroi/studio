"use client"

import * as React from "react"
import { 
  Search, 
  Download, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Plus,
  FileText,
  ClipboardList,
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useCollection, useMemoFirebase, useDoc, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collectionGroup, query, doc, collection } from "firebase/firestore"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { syncAnomalyToMysql } from "@/app/actions/mysql-sync"

const editSchema = z.object({
  anomalyDetails: z.string().min(1, "详情不能为空"),
  disposalSuggestions: z.string().min(1, "处置意见不能为空"),
  notifiedPersonFeedback: z.string().optional(),
})

export default function RecordsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null)
  const [editingRecord, setEditingRecord] = React.useState<any | null>(null)
  const [recordToDelete, setRecordToDelete] = React.useState<any | null>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)

  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: rawRecords, isLoading: isRecordsLoading } = useCollection(recordsQuery)

  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients } = useCollection(patientsQuery)

  const joinedRecords = React.useMemo(() => {
    if (!rawRecords) return []
    return rawRecords
      .filter(r => r.anomalyCategory) 
      .map(record => {
        const patient = patients?.find(p => p.id === record.patientProfileId)
        return {
          ...record,
          patientName: patient?.name || "未补录",
          patientGender: patient?.gender || "-",
          patientAge: patient?.age || "-",
          patientPhone: patient?.phoneNumber || "-",
        }
      })
  }, [rawRecords, patients])

  const filteredRecords = React.useMemo(() => {
    return joinedRecords.filter(r => 
      (r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.archiveNo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.checkupNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(b.checkupDate).getTime() - new Date(a.checkupDate).getTime())
  }, [joinedRecords, searchTerm])

  const editForm = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      anomalyDetails: "",
      disposalSuggestions: "",
      notifiedPersonFeedback: "",
    }
  })

  React.useEffect(() => {
    if (editingRecord) {
      editForm.reset({
        anomalyDetails: editingRecord.anomalyDetails || "",
        disposalSuggestions: editingRecord.disposalSuggestions || "",
        notifiedPersonFeedback: editingRecord.notifiedPersonFeedback || "",
      })
    }
  }, [editingRecord, editForm])

  const handleEditSave = (values: any) => {
    if (!editingRecord) return
    const recordRef = doc(db, "patientProfiles", editingRecord.patientProfileId, "medicalAnomalyRecords", editingRecord.id)
    updateDocumentNonBlocking(recordRef, values)
    
    // 同步到 MySQL
    if (systemConfig?.mysql) {
      syncAnomalyToMysql(systemConfig.mysql, { ...editingRecord, ...values }, 'SAVE');
    }

    setEditingRecord(null)
    toast({ title: "修改成功", description: "异常结果记录已更新并同步。" })
  }

  const confirmDelete = () => {
    if (!recordToDelete) return
    const recordRef = doc(db, "patientProfiles", recordToDelete.patientProfileId, "medicalAnomalyRecords", recordToDelete.id)
    deleteDocumentNonBlocking(recordRef)
    
    // 同步到 MySQL
    if (systemConfig?.mysql) {
      syncAnomalyToMysql(systemConfig.mysql, { id: recordToDelete.id }, 'DELETE');
    }

    setRecordToDelete(null)
    toast({ title: "已撤销登记", variant: "destructive", description: "该条医学异常记录已同步移除。" })
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">重要异常结果记录</h1>
          <p className="text-muted-foreground">综合展示并维护所有临床登记详情及患者基本资料</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => toast({ title: "开发中", description: "统计报表导出功能正在适配。" })}>
            <Download className="size-4" />
            批量导出
          </Button>
          <Button asChild className="gap-2 shadow-md">
            <Link href="/records/new">
              <Plus className="size-4" />
              新增临床登记
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索姓名、档案编号、体检编号..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold">体检日期</TableHead>
              <TableHead className="font-bold">档案/姓名</TableHead>
              <TableHead className="font-bold">性别/年龄</TableHead>
              <TableHead className="font-bold">联系电话</TableHead>
              <TableHead className="font-bold">体检编号</TableHead>
              <TableHead className="font-bold">异常种类</TableHead>
              <TableHead className="font-bold">异常详情 (摘要)</TableHead>
              <TableHead className="font-bold text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="hover:bg-muted/5 group">
                <TableCell className="font-medium whitespace-nowrap">{record.checkupDate}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-primary">{record.patientName}</span>
                    <span className="text-[10px] text-muted-foreground">ID: {record.archiveNo}</span>
                  </div>
                </TableCell>
                <TableCell>{record.patientGender} / {record.patientAge}</TableCell>
                <TableCell className="text-xs">{record.patientPhone}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{record.checkupNumber}</TableCell>
                <TableCell>
                  <Badge variant={record.anomalyCategory === 'A' ? 'destructive' : 'secondary'} className="font-bold px-3">
                    {record.anomalyCategory}类
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-xs text-muted-foreground" title={record.anomalyDetails}>
                    {record.anomalyDetails}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setSelectedRecord(record)}>
                      <Eye className="size-4 text-primary" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="gap-2" onSelect={() => setSelectedRecord(record)}>
                          <ClipboardList className="size-4" /> 完整临床详情
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onSelect={() => setEditingRecord(record)}>
                          <Edit className="size-4" /> 修改结果信息
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-primary" asChild>
                           <Link href={`/patients/${record.archiveNo}`}>
                            <FileText className="size-4" /> 查看影像档案
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive" onSelect={() => setRecordToDelete(record)}>
                          <Trash2 className="size-4" /> 撤销登记
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(filteredRecords.length === 0 && !isRecordsLoading) && (
          <div className="py-24 text-center">
            <ClipboardList className="size-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground font-medium">暂无符合条件的临床异常记录</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Badge variant={selectedRecord?.anomalyCategory === 'A' ? 'destructive' : 'secondary'}>
                {selectedRecord?.anomalyCategory}类结果
              </Badge>
              临床记录详情
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="bg-muted/30 p-4 rounded-lg space-y-4 md:col-span-1">
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold">患者档案</p><p className="font-bold text-lg">{selectedRecord?.patientName}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold">档案/体检号</p><p className="text-xs font-mono">{selectedRecord?.archiveNo}<br/>{selectedRecord?.checkupNumber}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold">体检日期</p><p className="text-xs">{selectedRecord?.checkupDate}</p></div>
              <Separator />
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold">登记时初始告知反馈</p><p className="text-xs italic">{selectedRecord?.notifiedPersonFeedback || "登记时未录入反馈"}</p></div>
            </div>
            <div className="space-y-6 md:col-span-2">
              <div className="space-y-2">
                <p className="text-sm font-bold text-destructive flex items-center gap-2">医学异常发现</p>
                <ScrollArea className="h-[120px] border p-4 rounded-xl bg-white text-sm leading-relaxed whitespace-pre-wrap">{selectedRecord?.anomalyDetails}</ScrollArea>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-primary flex items-center gap-2">临床处置建议</p>
                <ScrollArea className="h-[120px] border p-4 rounded-xl bg-white text-sm leading-relaxed whitespace-pre-wrap">{selectedRecord?.disposalSuggestions}</ScrollArea>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => setSelectedRecord(null)} className="px-8">关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-xl">
          <DialogHeader><DialogTitle>临床结果维护</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSave)} className="space-y-4">
              <FormField control={editForm.control} name="anomalyDetails" render={({ field }) => (
                <FormItem><FormLabel>医学异常发现</FormLabel><FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="disposalSuggestions" render={({ field }) => (
                <FormItem><FormLabel>处置意见</FormLabel><FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="notifiedPersonFeedback" render={({ field }) => (
                <FormItem><FormLabel>初始告知反馈 (补录/修改)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>取消</Button>
                <Button type="submit">应用临床更改</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              确认撤销临床登记？
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条异常结果记录吗？此操作将永久移除相关数据并从中心数据库同步。
            </AlertDialogDescription>
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
