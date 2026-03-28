"use client"

import * as React from "react"
import { 
  Search, 
  Eye,
  Edit,
  MoreVertical,
  RefreshCcw,
  Loader2,
  Plus,
  Trash2,
  Calculator,
  Download,
  Upload,
  FileSpreadsheet
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { fetchPatients, syncPatientToMysql, calculateAllAges, bulkImportPatients } from "@/app/actions/mysql-sync"

const patientSchema = z.object({
  id: z.string().min(1, "档案编号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  gender: z.enum(["男", "女", "其他"]),
  age: z.coerce.number().min(0),
  idNumber: z.string().length(18, "身份证号需为18位").or(z.string().length(0)),
  organization: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().min(1, "电话不能为空"),
  status: z.enum(["正常", "死亡", "无法联系"]),
})

export default function PatientsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [patients, setPatients] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAddingNew, setIsAddingNew] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [editingPatient, setEditingPatient] = React.useState<any>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const loadPatients = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      const data = await fetchPatients(config)
      setPatients(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => { loadPatients() }, [loadPatients])

  const form = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: { status: "正常", gender: "男", age: 0 }
  })

  const handleUpdateAges = async () => {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    await calculateAllAges(config)
    toast({ title: "年龄已自动更新", description: "基于身份证及体检周期完成全量计算。" })
    loadPatients()
  }

  const onSubmit = async (values: any) => {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    try {
      await syncPatientToMysql(config, values)
      toast({ title: "保存成功" })
      loadPatients()
      setIsAddingNew(false); setEditingPatient(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "失败", description: err.message })
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length <= 1) {
        toast({ variant: "destructive", title: "文件无效", description: "CSV 文件中没有数据行。" });
        setIsLoading(false);
        return;
      }

      const patientsToImport = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        return {
          archiveNo: cols[0],
          name: cols[1],
          gender: cols[2],
          age: parseInt(cols[3]) || 0,
          idNumber: cols[4],
          phoneNumber: cols[5],
          organization: cols[6],
          address: cols[7],
          status: cols[8] || '正常'
        }
      }).filter(p => p.archiveNo)

      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      try {
        const res = await bulkImportPatients(config, patientsToImport)
        toast({ title: "导入成功", description: `已成功导入/更新 ${res.count} 名患者档案。` })
        loadPatients()
      } catch (err: any) {
        toast({ variant: "destructive", title: "导入失败", description: err.message })
      } finally {
        setIsLoading(false)
        setIsImporting(false)
      }
    }
    reader.readAsText(file)
  }

  const downloadTemplate = () => {
    const headers = "档案编号,姓名,性别,年龄,身份证号,电话,单位,地址,状态"
    const example = "D0001,张三,男,45,110101198001011234,13800138000,某某公司,某某街道,正常"
    const blob = new Blob(["\ufeff" + headers + "\n" + example], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "个人档案导入模板.csv"
    link.click()
  }

  const filteredPatients = patients.filter(p => 
    p.name?.includes(searchTerm) || p.archiveNo?.includes(searchTerm) || p.phoneNumber?.includes(searchTerm)
  )

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">档案管理中心</h1>
          <p className="text-muted-foreground">档案编号 ({'>'}) 身份证号 • 批量导入与同步引擎</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImporting(true)} className="gap-2 bg-green-50 text-green-700 border-green-200">
            <Upload className="size-4" /> 批量导入
          </Button>
          <Button variant="outline" onClick={handleUpdateAges} className="gap-2"><Calculator className="size-4" /> 自动算龄</Button>
          <Button onClick={() => setIsAddingNew(true)} className="gap-2"><Plus className="size-4" /> 新增档案</Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="搜索姓名、档案号、电话..." className="pl-10 h-11 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>档案编号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>基本信息</TableHead>
              <TableHead>电话</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary" /> 处理中...</TableCell></TableRow>
            ) : filteredPatients.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground">暂无档案记录</TableCell></TableRow>
            ) : filteredPatients.map(p => (
              <TableRow key={p.archiveNo} className="group">
                <TableCell className="font-bold text-primary">{p.archiveNo}</TableCell>
                <TableCell className={!p.name ? "text-amber-500 italic" : "font-medium"}>{p.name || "待补录"}</TableCell>
                <TableCell className="text-xs">{p.gender} / {p.age}岁 / {p.idNumber || "无ID"}</TableCell>
                <TableCell className="text-sm font-mono">{p.phoneNumber}</TableCell>
                <TableCell>
                  <Badge variant={p.status === '正常' ? 'default' : p.status === '死亡' ? 'destructive' : 'secondary'}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" asChild title="查看详情"><Link href={`/patients/${p.archiveNo}`}><Eye className="size-4 text-primary" /></Link></Button>
                    <Button variant="ghost" size="icon" title="编辑资料" onClick={() => { setEditingPatient(p); form.reset({ ...p, id: p.archiveNo }); }}><Edit className="size-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>批量导入患者档案</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-2">
              <p className="font-bold text-primary">CSV 导入列顺序：</p>
              <p className="font-mono opacity-80">档案编号, 姓名, 性别, 年龄, 身份证号, 电话, 单位, 地址, 状态</p>
              <p className="text-muted-foreground italic text-[10px] mt-2">注：若档案编号重复将自动更新。允许部分非必填列为空。</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full gap-2 border-dashed" onClick={downloadTemplate}>
                <Download className="size-4" /> 下载档案导入模板
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCsvImport} 
                className="hidden" 
                accept=".csv"
              />
              <Button className="w-full h-12 gap-2" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="size-4" /> 选择并上传 CSV 文件
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingNew || !!editingPatient} onOpenChange={(o) => { if(!o) {setIsAddingNew(false); setEditingPatient(null); }}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isAddingNew ? "手动录入档案" : "编辑档案资料"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="id" render={({ field }) => (
                  <FormItem className="col-span-full"><FormLabel>档案编号</FormLabel><FormControl><Input {...field} disabled={!!editingPatient} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>姓名</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="idNumber" render={({ field }) => (
                  <FormItem><FormLabel>身份证号 (18位)</FormLabel><FormControl><Input maxLength={18} {...field} /></FormControl></FormItem>
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
                  <FormItem><FormLabel>当前年龄</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel>电话</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="正常">正常</SelectItem><SelectItem value="死亡">死亡 (锁定任务)</SelectItem><SelectItem value="无法联系">无法联系</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="organization" render={({ field }) => (
                  <FormItem className="col-span-full"><FormLabel>工作单位</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit">保存至中心库</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}