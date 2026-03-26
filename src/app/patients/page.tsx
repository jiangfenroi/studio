
"use client"

import * as React from "react"
import { 
  Search, 
  UserPlus,
  Eye,
  Edit,
  MoreVertical,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  FileDown,
  Plus,
  AlertTriangle,
  RefreshCcw,
  Loader2
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
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { fetchPatients, syncPatientToMysql } from "@/app/actions/mysql-sync"

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
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [patients, setPatients] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [editingPatient, setEditingPatient] = React.useState<PatientFormValues | null>(null)
  const [isAddingNew, setIsAddingNew] = React.useState(false)
  const [patientIdToDelete, setPatientIdToDelete] = React.useState<string | null>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)

  const loadPatients = React.useCallback(async () => {
    if (!config?.mysql) return
    setIsLoading(true)
    try {
      const data = await fetchPatients(config.mysql)
      setPatients(data)
    } finally {
      setIsLoading(false)
    }
  }, [config])

  React.useEffect(() => {
    if (config) loadPatients()
  }, [config, loadPatients])

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
    return patients.filter(p => {
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

  const onSubmit = async (values: PatientFormValues) => {
    if (!config?.mysql) return
    try {
      await syncPatientToMysql(config.mysql, values, 'SAVE');
      toast({
        title: isAddingNew ? "新档案已创建" : "档案更新成功",
        description: `患者 ${values.name} 的信息已同步。`,
      })
      loadPatients()
      setEditingPatient(null)
      setIsAddingNew(false)
    } catch (err: any) {
      toast({ variant: "destructive", title: "同步失败", description: err.message })
    }
  }

  const confirmDeletePatient = async () => {
    if (!patientIdToDelete || !config?.mysql) return
    try {
      await syncPatientToMysql(config.mysql, { id: patientIdToDelete }, 'DELETE');
      toast({ title: "档案已删除", variant: "destructive" })
      loadPatients()
      setPatientIdToDelete(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "删除失败", description: err.message })
    }
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">档案管理中心</h1>
          <p className="text-muted-foreground">纯 MySQL 驱动：统筹全院患者健康信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="gap-2 text-primary hover:bg-primary/5" onClick={loadPatients}>
            <RefreshCcw className="size-4" />
            刷新数据
          </Button>
          <Button className="gap-2 shadow-md" onClick={handleAddNew}>
            <Plus className="size-4" />
            新增档案
          </Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案编号、手机号、身份证..." 
          className="pl-10 h-11" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px]">档案编号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>性别/年龄</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>身份证号</TableHead>
              <TableHead>单位</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /> 加载中...</TableCell></TableRow>
            ) : filteredPatients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-muted/10 transition-colors group">
                <TableCell className="font-bold text-primary">{patient.id}</TableCell>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.gender} / {patient.age}岁</TableCell>
                <TableCell className="text-sm">{patient.phoneNumber}</TableCell>
                <TableCell className="text-xs font-mono">{patient.idNumber}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[150px]">{patient.organization || '无'}</TableCell>
                <TableCell>
                  <Badge variant={patient.status === '正常' ? 'default' : patient.status === '死亡' ? 'destructive' : 'secondary'}>
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/patients/${patient.id}`}><Eye className="size-4 text-primary" /></Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(patient)}><Edit className="size-4 mr-2" /> 资料维护</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setPatientIdToDelete(patient.id)}><Trash2 className="size-4 mr-2" /> 删除档案</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingPatient || isAddingNew} onOpenChange={(o) => { if(!o) {setEditingPatient(null); setIsAddingNew(false);}}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isAddingNew ? "新增档案" : "资料维护"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="id" render={({ field }) => (
                  <FormItem className="col-span-full"><FormLabel>档案编号</FormLabel><FormControl><Input {...field} disabled={!!editingPatient} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>姓名</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>性别</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="男">男</SelectItem><SelectItem value="女">女</SelectItem><SelectItem value="其他">其他</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem><FormLabel>年龄</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel>电话</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="idNumber" render={({ field }) => (
                  <FormItem className="col-span-full"><FormLabel>身份证号</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="正常">正常</SelectItem><SelectItem value="死亡">死亡</SelectItem><SelectItem value="无法联系">无法联系</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit">保存资料</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!patientIdToDelete} onOpenChange={(o) => !o && setPatientIdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除？</AlertDialogTitle><AlertDialogDescription>此操作不可撤销。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={confirmDeletePatient} className="bg-destructive">确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
