
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

// Patient Schema for Editing
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

// Mock patients
const initialPatients: PatientFormValues[] = [
  { id: 'D1001', name: '张三', gender: '男', age: 45, phoneNumber: '13800138000', idNumber: '440101198001012345', organization: '广州科技有限公司', address: '天河区路101号', status: '正常' },
  { id: 'D1002', name: '李四', gender: '女', age: 62, phoneNumber: '13912345678', idNumber: '440101196301012345', organization: '白云区第一中学', address: '白云大道北', status: '正常' },
  { id: 'D1003', name: '王五', gender: '男', age: 50, phoneNumber: '13500001111', idNumber: '440101197501012345', organization: '退休', address: '越秀区环市路', status: '死亡' },
]

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [patients, setPatients] = React.useState<PatientFormValues[]>(initialPatients)
  const [editingPatient, setEditingPatient] = React.useState<PatientFormValues | null>(null)
  const { toast } = useToast()

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

  const filteredPatients = patients.filter(p => 
    p.name.includes(searchTerm) || p.id.includes(searchTerm) || p.phoneNumber.includes(searchTerm) || p.idNumber.includes(searchTerm)
  )

  const handleEdit = (patient: PatientFormValues) => {
    setEditingPatient(patient)
    form.reset(patient)
  }

  const onSubmitEdit = (values: PatientFormValues) => {
    setPatients(prev => prev.map(p => p.id === values.id ? values : p))
    setEditingPatient(null)
    toast({
      title: "档案更新成功",
      description: `患者 ${values.name} 的信息已同步至数据库。`,
    })
  }

  const handleDownloadTemplate = () => {
    toast({
      title: "正在准备模板",
      description: "健康档案批量导入模版.xlsx 已开始下载。",
    })
  }

  const handleImportExcel = () => {
    toast({
      title: "Excel导入成功",
      description: "已成功解析并导入 12 条患者健康档案。",
    })
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">档案中心</h1>
          <p className="text-muted-foreground">管理全院患者健康档案，支持批量导入与信息维护</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="size-4" />
            下载模版
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleImportExcel}>
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
                        <DropdownMenuItem className="gap-2" onClick={() => handleEdit(patient)}>
                          <Edit className="size-4" /> 修改资料
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Download className="size-4" /> 导出PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive">
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
        {filteredPatients.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            未找到匹配的档案记录
          </div>
        )}
      </div>

      {/* Edit Patient Dialog */}
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
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>性别</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择性别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="男">男</SelectItem>
                          <SelectItem value="女">女</SelectItem>
                          <SelectItem value="其他">其他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>年龄</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>身份证号</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>当前状态</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="正常">正常</SelectItem>
                          <SelectItem value="死亡">死亡</SelectItem>
                          <SelectItem value="无法联系">无法联系</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-full">
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>单位/部门</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-full">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>家庭住址</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
