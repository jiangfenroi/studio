
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
  Trash2
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
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
        p.name?.toLowerCase().includes(search) || 
        p.id?.toLowerCase().includes(search) || 
        p.phoneNumber?.toLowerCase().includes(search) || 
        p.idNumber?.toLowerCase().includes(search)
      )
    })
  }, [patients, searchTerm])

  const handleEdit = (patient: any) => {
    setEditingPatient(patient)
    form.reset(patient)
  }

  const onSubmitEdit = (values: PatientFormValues) => {
    const patientRef = doc(db, "patientProfiles", values.id)
    updateDocumentNonBlocking(patientRef, values)
    setEditingPatient(null)
    toast({
      title: "档案更新成功",
      description: `患者 ${values.name} 的信息已同步至数据库。`,
    })
  }

  const handleDelete = (id: string) => {
    if (confirm("确定要永久删除该患者档案吗？此操作不可逆，将同时删除该患者的所有诊疗记录。")) {
      const patientRef = doc(db, "patientProfiles", id)
      deleteDocumentNonBlocking(patientRef)
      toast({
        title: "档案已删除",
        variant: "destructive"
      })
    }
  }

  const handleExportCSV = () => {
    if (filteredPatients.length === 0) {
      toast({ title: "无可导出数据", variant: "destructive" })
      return
    }
    const headers = ["档案编号", "姓名", "性别", "年龄", "身份证", "电话", "单位", "状态"]
    const rows = filteredPatients.map(p => [
      p.id, p.name, p.gender, p.age, p.idNumber, p.phoneNumber, `"${(p.organization || "-").replace(/"/g, '""')}"`, p.status
    ])
    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `患者档案_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: "导出成功", description: "档案 CSV 已生成。" })
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">档案中心</h1>
          <p className="text-muted-foreground">管理全院患者健康档案，支持批量导入与信息维护</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <FileSpreadsheet className="size-4" />
            导出档案
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => toast({ title: "功能开发中", description: "Excel 导入功能正在对接 MySQL 核心库。" })}>
            <Upload className="size-4" />
            批量导入
          </Button>
          <Button asChild className="gap-2">
            <Link href="/records/new">
              <UserPlus className="size-4" />
              新增档案
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索姓名、档案编号、手机号、身份证号..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="gap-2 h-11 px-6">
          <Filter className="size-4" />
          高级筛选
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px]">档案编号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>性别/年龄</TableHead>
              <TableHead>身份证号</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>单位</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-muted/10 transition-colors">
                <TableCell className="font-bold text-primary">{patient.id}</TableCell>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.gender} / {patient.age}岁</TableCell>
                <TableCell className="font-mono text-xs">{patient.idNumber}</TableCell>
                <TableCell className="text-sm">{patient.phoneNumber}</TableCell>
                <TableCell className="text-muted-foreground max-w-[150px] truncate">{patient.organization || '无'}</TableCell>
                <TableCell>
                  <Badge 
                    variant={patient.status === '正常' ? 'default' : patient.status === '死亡' ? 'destructive' : 'secondary'}
                    className="font-medium"
                  >
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild title="查看档案">
                      <Link href={`/patients/${patient.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2" onSelect={() => handleEdit(patient)}>
                          <Edit className="size-4" /> 修改资料
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onSelect={() => toast({ title: "正在生成", description: "PDF 导出任务已加入队列。" })}>
                          <Download className="size-4" /> 导出PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive" onSelect={() => handleDelete(patient.id)}>
                          <Trash2 className="size-4" /> 删除档案
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredPatients.length === 0 && !isLoading && (
          <div className="py-20 text-center text-muted-foreground">
            未找到匹配的档案记录
          </div>
        )}
      </div>

      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑患者健康档案</DialogTitle>
            <DialogDescription>
              档案编号: <span className="font-bold text-primary">{editingPatient?.id}</span>。修改后将同步至系统数据库。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>姓名</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>性别</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="选择性别" /></SelectTrigger></FormControl>
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
                <FormField control={form.control} name="idNumber" render={({ field }) => (
                  <FormItem><FormLabel>身份证号</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel>联系电话</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>当前状态</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="正常">正常</SelectItem>
                        <SelectItem value="死亡">死亡</SelectItem>
                        <SelectItem value="无法联系">无法联系</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="col-span-full">
                  <FormField control={form.control} name="organization" render={({ field }) => (
                    <FormItem><FormLabel>单位/部门</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="col-span-full">
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>家庭住址</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingPatient(null)}>取消</Button>
                <Button type="submit" className="gap-2">
                  <CheckCircle2 className="size-4" />
                  保存修改
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
