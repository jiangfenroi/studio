
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
  AlertTriangle,
  User,
  CreditCard,
  Phone,
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Building
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
import { useFirestore, useCollection, useMemoFirebase, useDoc, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
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
  const { user } = useUser()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null)
  const [editingRecord, setEditingRecord] = React.useState<any | null>(null)
  const [recordToDelete, setRecordToDelete] = React.useState<any | null>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)

  // 获取所有异常记录 (对应 SP_YCJG)
  const recordsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collectionGroup(db, "medicalAnomalyRecords"));
  }, [db, user])
  const { data: rawRecords, isLoading: isRecordsLoading } = useCollection(recordsQuery)

  // 获取所有患者档案用于联表 (对应 SP_PERSON)
  const patientsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return collection(db, "patientProfiles");
  }, [db, user])
  const { data: patients } = useCollection(patientsQuery)

  // 深度联表逻辑：合并 SP_PERSON 与 SP_YCJG 全字段信息
  const joinedRecords = React.useMemo(() => {
    if (!rawRecords) return []
    return rawRecords
      .filter(r => r.anomalyCategory) // 仅保留主异常记录
      .map(record => {
        const patient = patients?.find(p => p.id === record.patientProfileId)
        return {
          ...record,
          // 关联 SP_PERSON 字段
          patientName: patient?.name || "未补录",
          patientGender: patient?.gender || "-",
          patientAge: patient?.age || "-",
          patientIdNumber: patient?.idNumber || "-",
          patientPhone: patient?.phoneNumber || "-",
          patientStatus: patient?.status || "正常",
          patientOrg: patient?.organization || "-",
          patientAddr: patient?.address || "-",
        }
      })
  }, [rawRecords, patients])

  const filteredRecords = React.useMemo(() => {
    return joinedRecords.filter(r => 
      (r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.archiveNo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       r.checkupNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.patientIdNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <h1 className="text-3xl font-bold text-primary">重要异常结果管理</h1>
          <p className="text-muted-foreground">全字段联表：个人档案 (SP_PERSON) + 临床登记 (SP_YCJG)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => toast({ title: "报表生成中", description: "正在汇总全字段 Excel 报表..." })}>
            <Download className="size-4" />
            导出全部信息
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
            placeholder="搜索姓名、档案号、体检号、身份证..." 
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
              <TableHead className="font-bold whitespace-nowrap">体检日期</TableHead>
              <TableHead className="font-bold">档案编号/姓名</TableHead>
              <TableHead className="font-bold">性别/年龄</TableHead>
              <TableHead className="font-bold">身份证号</TableHead>
              <TableHead className="font-bold">联系电话</TableHead>
              <TableHead className="font-bold">档案状态</TableHead>
              <TableHead className="font-bold">体检编号</TableHead>
              <TableHead className="font-bold">异常类别</TableHead>
              <TableHead className="font-bold text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="hover:bg-muted/5 group">
                <TableCell className="font-medium whitespace-nowrap text-xs">{record.checkupDate}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-primary">{record.patientName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">ID: {record.archiveNo}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{record.patientGender} / {record.patientAge}岁</TableCell>
                <TableCell className="text-xs font-mono">{record.patientIdNumber}</TableCell>
                <TableCell className="text-xs">{record.patientPhone}</TableCell>
                <TableCell>
                  <Badge 
                    variant={record.patientStatus === '正常' ? 'default' : record.patientStatus === '死亡' ? 'destructive' : 'secondary'}
                    className="text-[10px] px-2 py-0 h-5"
                  >
                    {record.patientStatus}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">{record.checkupNumber}</TableCell>
                <TableCell>
                  <Badge variant={record.anomalyCategory === 'A' ? 'destructive' : 'secondary'} className="font-bold text-[10px]">
                    {record.anomalyCategory}类
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setSelectedRecord(record)} title="查看详情">
                      <Eye className="size-4 text-primary" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem className="gap-2" onSelect={() => setSelectedRecord(record)}>
                          <ClipboardList className="size-4" /> 全字段详情
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onSelect={() => setEditingRecord(record)}>
                          <Edit className="size-4" /> 维护医学结果
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-primary" asChild>
                           <Link href={`/patients/${record.archiveNo}`}>
                            <FileText className="size-4" /> 查看完整病历
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
            <p className="text-muted-foreground font-medium">暂无临床异常记录</p>
          </div>
        )}
      </div>

      {/* 详情查看弹窗 (全字段视图) */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 bg-primary text-white">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Activity className="size-6" />
                临床档案全字段详情
              </DialogTitle>
              <Badge className="bg-white/20 text-white border-white/40">
                异常类别: {selectedRecord?.anomalyCategory}类
              </Badge>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 左侧：SP_PERSON 字段 */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary border-b pb-2">
                  <User className="size-4" />
                  <h3 className="font-bold">个人档案 (SP_PERSON)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">档案编号</p>
                    <p className="font-mono text-sm">{selectedRecord?.archiveNo}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">姓名</p>
                    <p className="font-bold">{selectedRecord?.patientName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">性别 / 年龄</p>
                    <p className="text-sm">{selectedRecord?.patientGender} / {selectedRecord?.patientAge}岁</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">档案状态</p>
                    <Badge variant={selectedRecord?.patientStatus === '正常' ? 'default' : 'destructive'} className="h-5">
                      {selectedRecord?.patientStatus}
                    </Badge>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">身份证号</p>
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-3 text-muted-foreground" />
                      <p className="font-mono text-sm">{selectedRecord?.patientIdNumber}</p>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">联系电话</p>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3 text-muted-foreground" />
                      <p className="text-sm">{selectedRecord?.patientPhone}</p>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">所属单位</p>
                    <div className="flex items-center gap-2">
                      <Building className="size-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{selectedRecord?.patientOrg}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：SP_YCJG 字段 */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-destructive border-b pb-2">
                  <AlertTriangle className="size-4" />
                  <h3 className="font-bold">异常结果 (SP_YCJG)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">体检编号</p>
                    <p className="font-mono text-sm">{selectedRecord?.checkupNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">体检日期</p>
                    <p className="text-sm">{selectedRecord?.checkupDate}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">医学详情</p>
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs leading-relaxed">
                      {selectedRecord?.anomalyDetails}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">处置建议</p>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs leading-relaxed">
                      {selectedRecord?.disposalSuggestions}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">被告知人</p>
                    <p className="text-sm">{selectedRecord?.notifiedPerson || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">告知状态</p>
                    <Badge variant={selectedRecord?.isNotified ? 'default' : 'outline'} className="h-5">
                      {selectedRecord?.isNotified ? "已告知" : "未告知"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">告知人/日期</p>
                    <p className="text-[10px] font-medium">{selectedRecord?.notifier || "-"} / {selectedRecord?.notificationDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">宣教状态</p>
                    <Badge variant={selectedRecord?.isHealthEducationProvided ? 'outline' : 'secondary'} className="h-5">
                      {selectedRecord?.isHealthEducationProvided ? "已宣教" : "未宣教"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="col-span-full mt-4 p-4 bg-muted/30 rounded-xl border-dashed border-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm font-bold">反馈反馈</span>
                </div>
                <p className="text-sm italic text-muted-foreground leading-relaxed">
                  {selectedRecord?.notifiedPersonFeedback || "暂无初始沟通反馈记录"}
                </p>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t bg-muted/10">
            <Button onClick={() => setSelectedRecord(null)} className="px-10">
              确认并关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改结果弹窗 */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-xl">
          <DialogHeader><DialogTitle>医学结果维护</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSave)} className="space-y-4">
              <FormField control={editForm.control} name="anomalyDetails" render={({ field }) => (
                <FormItem><FormLabel>医学异常发现</FormLabel><FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="disposalSuggestions" render={({ field }) => (
                <FormItem><FormLabel>处置建议</FormLabel><FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="notifiedPersonFeedback" render={({ field }) => (
                <FormItem><FormLabel>告知反馈 (补录/修改)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>取消</Button>
                <Button type="submit">应用临床更改</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 撤销登记确认弹窗 */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              确认撤销临床登记？
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该条异常结果记录吗？此操作将永久移除相关数据并同步至中心数据库。
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
