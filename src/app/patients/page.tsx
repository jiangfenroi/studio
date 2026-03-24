
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  UserPlus,
  Eye,
  Edit,
  MoreVertical,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  FileDown,
  Plus,
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
} from "@/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"

const patientSchema = z.object({
  id: z.string().min(1, "档案编号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  gender: z.enum(["男", "女", "其他"]),
  age: z.coerce.number().min(0).max(150),
  idNumber: z.string().min(1, "身份证号不能为空"),
  organization: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().min(1, "联系电话不能为空"),
  status: z.enum(["正常", "死亡", "无法联系"]),
})

type PatientFormValues = z.infer<typeof patientSchema>

export default function PatientsPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [editingPatient, setEditingPatient] = React.useState<PatientFormValues | null>(null)
  const [isAddingNew, setIsAddingNew] = React.useState(false)
  const [patientIdToDelete, setPatientIdToDelete] = React.useState<string | null>(null)
  const { toast } = useToast()

  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients, isLoading } = useCollection(patientsQuery)

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      id: "",
      name: "",
      gender: "男",
      age: 0,
      idNumber: "",
      organization: "",
      address: "",
      phoneNumber: "",
      status: "正常",
    },
  })

  const filteredPatients = React.useMemo(() => {
    return (patients || []).filter(p => {
      const search = searchTerm.toLowerCase();
      return (
        (p.name?.toLowerCase().includes(search)) || 
        (p.id?.toLowerCase().includes(search)) || 
        (p.phoneNumber?.toLowerCase().includes(search)) || 
        (p.idNumber?.toLowerCase().includes(search))
      )
    })
  }, [patients, searchTerm])

  const handleEdit = (patient: any) => {
    setEditingPatient(patient)
    form.reset(patient)
  }

  const handleAddNew = () => {
    setIsAddingNew(true)
    form.reset({
      id: "",
      name: "",
      gender: "男",
      age: 0,
      idNumber: "",
      organization: "",
      address: "",
      phoneNumber: "",
      status: "正常",
    })
  }

  const onSubmit = (values: PatientFormValues) => {
    const patientRef = doc(db, "patientProfiles", values.id)
    setDocumentNonBlocking(patientRef, values, { merge: true })
    setEditingPatient(null)
    setIsAddingNew(false)
    toast({
      title: isAddingNew ? "新档案已创建" : "档案更新成功",
      description: `患者 ${values.name} 的信息已同步。`,
    })
  }

  const confirmDeletePatient = () => {
    if (!patientIdToDelete) return
    const patientRef = doc(db, "patientProfiles", patientIdToDelete)
    deleteDocumentNonBlocking(patientRef)
    setPatientIdToDelete(null)
    toast({
      title: "档案已删除",
      variant: "destructive",
      description: "该患者档案及关联数据已被移除。"
    })
  }

  const handleDownloadTemplate = () => {
    const headers = ["档案编号*", "姓名*", "性别(男/女/其他)*", "年龄*", "身份证号*", "单位", "地址", "电话*", "状态(正常/死亡/无法联系)*"]
    const csvContent = "\ufeff" + headers.join(",")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `健康档案导入模板.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportCSV = () => {
    if (filteredPatients.length === 0) return
    const headers = ["档案编号", "姓名", "性别", "年龄", "身份证", "电话", "单位", "状态"]
    const rows = filteredPatients.map(p => [
      p.id, p.name, p.gender, p.age, p.idNumber, p.phoneNumber, `"${(p.organization || "-").replace(/"/g, '""')}"`, p.status
    ])
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `健康档案导出_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">档案管理中心</h1>
          <p className="text-muted-foreground">统筹全院患者健康信息，档案编号为最高级唯一识别码</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
            <FileDown className="size-4" />
            下载模板
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <FileSpreadsheet className="size-4" />
            导出档案
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 shadow-md">
                <Plus className="size-4" />
                新增档案
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/records/new" className="cursor-pointer">
                  <UserPlus className="size-4 mr-2" /> 体检异常登记
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleAddNew} className="cursor-pointer">
                <Plus className="size-4 mr-2" /> 纯个人信息补录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索姓名、档案编号、手机号、身份证..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px]">档案编号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>性别/年龄</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>单位</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-muted/10 transition-colors group">
                <TableCell className="font-bold text-primary">{patient.id}</TableCell>
                <TableCell className="font-medium">{patient.name || <span className="text-muted-foreground italic">未补录</span>}</TableCell>
                <TableCell>{patient.gender || '-'} / {patient.age || '-'}岁</TableCell>
                <TableCell className="text-sm">{patient.phoneNumber || '-'}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[150px]">{patient.organization || '无'}</TableCell>
                <TableCell>
                  <Badge 
                    variant={patient.status === '正常' ? 'default' : patient.status === '死亡' ? 'destructive' : 'secondary'}
                  >
                    {patient.status || '正常'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" asChild title="电子病历">
                      <Link href={`/patients/${patient.id}`}>
                        <Eye className="size-4 text-primary" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(patient)}>
                          <Edit className="size-4 mr-2" /> 补录/修改资料
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setPatientIdToDelete(patient.id)}>
                          <Trash2 className="size-4 mr-2" /> 删除档案
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(filteredPatients.length === 0 && !isLoading) && (
          <div className="py-24 text-center">
            <UserPlus className="size-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">暂无符合条件的健康档案</p>
          </div>
        )}
      </div>

      <Dialog open={!!editingPatient || isAddingNew} onOpenChange={(open) => {
        if (!open) {
          setEditingPatient(null);
          setIsAddingNew(false);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isAddingNew ? "新增个人健康档案" : "补录/编辑健康档案"}</DialogTitle>
            <DialogDescription>
              {isAddingNew ? "档案编号为核心索引，创建后支持跨模块联动。" : `正在维护档案编号: ${editingPatient?.id}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-full">
                  <FormField control={form.control} name="id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-primary">档案编号 (Archive No.)</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!!editingPatient} placeholder="D1234567890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>姓名</FormLabel><FormControl><Input {...field} placeholder="患者全名" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>性别</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="男">男</SelectItem>
                        <SelectItem value="女">女</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem><FormLabel>年龄</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel>联系电话</FormLabel><FormControl><Input {...field} placeholder="11位手机号或座机" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="col-span-full">
                  <FormField control={form.control} name="idNumber" render={({ field }) => (
                    <FormItem><FormLabel>身份证号</FormLabel><FormControl><Input {...field} placeholder="18位身份证号码" className="font-mono" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>档案状态</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="正常">正常</SelectItem>
                        <SelectItem value="死亡">死亡</SelectItem>
                        <SelectItem value="无法联系">无法联系</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="organization" render={({ field }) => (
                  <FormItem><FormLabel>所属单位/部门</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="col-span-full">
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>家庭/通讯住址</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setEditingPatient(null);
                  setIsAddingNew(false);
                }}>取消</Button>
                <Button type="submit" className="gap-2">
                  <CheckCircle2 className="size-4" />
                  保存档案信息
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!patientIdToDelete} onOpenChange={(open) => !open && setPatientIdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              确认永久删除档案？
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作将同时删除该患者的所有异常结果记录及随访记录。该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePatient} className="bg-destructive hover:bg-destructive/90">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
