"use client"

import * as React from "react"
import { 
  Search, 
  Eye,
  Edit,
  RefreshCcw,
  Loader2,
  Plus,
  Calculator,
  Upload,
  FileSpreadsheet,
  Download,
  FileText,
  AlertCircle,
  Activity
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { fetchPatients, syncPatientToMysql, calculateAllAges, bulkImportPatients } from "@/app/actions/mysql-sync"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

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
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        
        if (lines.length <= 1) {
          toast({ variant: "destructive", title: "文件无效", description: "CSV 文件中没有数据行或编码错误。" });
          setIsLoading(false);
          return;
        }

        const patientsToImport = lines.slice(1).map(line => {
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          return {
            archiveNo: cols[0],
            name: cols[1],
            gender: cols[2] || "男",
            age: parseInt(cols[3]) || 0,
            idNumber: cols[4] || "",
            phoneNumber: cols[5] || "",
            organization: cols[6] || "",
            address: cols[7] || "",
            status: cols[8] || '正常'
          }
        }).filter(p => p.archiveNo)

        const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
        const res = await bulkImportPatients(config, patientsToImport)
        toast({ title: "导入成功", description: `已成功导入/更新 ${res.count} 名患者档案。` })
        loadPatients()
      } catch (err: any) {
        toast({ variant: "destructive", title: "导入失败", description: "请确保文件保存为 'CSV UTF-8' 格式。" })
      } finally {
        setIsLoading(false)
        setIsImporting(false)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const downloadTemplate = () => {
    const headers = "档案编号(必填),姓名(必填),性别(选填),年龄(选填),身份证号(选填),电话(必填),单位(选填),地址(选填),状态(选填:正常/死亡/无法联系)"
    const example = "D0001,张三,男,45,110101198001011234,13800138000,某某公司,某某街道,正常"
    const blob = new Blob(["\ufeff" + headers + "\n" + example], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "个人档案批量导入模板.csv"
    link.click()
  }

  const filteredPatients = patients.filter(p => 
    p.name?.includes(searchTerm) || p.archiveNo?.includes(searchTerm) || p.phoneNumber?.includes(searchTerm)
  )

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">档案管理中心</h1>
          <p className="text-muted-foreground font-medium">100% MySQL 核心驱动 • 全量档案同步</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImporting(true)} className="gap-2 bg-green-50 text-green-700 border-green-200">
            <Upload className="size-4" /> 批量导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleUpdateAges} className="gap-2"><Calculator className="size-4" /> 自动算龄</Button>
          <Button size="sm" onClick={() => setIsAddingNew(true)} className="gap-2 shadow-md"><Plus className="size-4" /> 新增档案</Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="搜索姓名、档案号、电话..." 
          className="pl-12 h-12 bg-white shadow-sm rounded-xl border-primary/10" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-primary/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[250px]">患者姓名</TableHead>
              <TableHead className="w-[250px]">档案信息</TableHead>
              <TableHead className="w-[300px]">基本属性</TableHead>
              <TableHead className="w-[150px]">状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary" /> 正在加载档案库...</TableCell></TableRow>
            ) : filteredPatients.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">暂无符合条件的档案记录</TableCell></TableRow>
            ) : filteredPatients.map(p => (
              <TableRow key={p.archiveNo} className="group transition-colors">
                <TableCell>
                  <span className={cn(
                    "text-xl font-bold text-foreground leading-tight",
                    !p.name && "text-amber-500 italic"
                  )}>
                    {p.name || "待补录"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">
                      {p.phoneNumber}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground mt-1 opacity-70">
                      {p.archiveNo}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-bold opacity-80">
                  {p.gender} / {p.age}岁 / <span className="font-mono text-[10px] text-muted-foreground">{p.idNumber || "无 ID"}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === '正常' ? 'default' : p.status === '死亡' ? 'destructive' : 'secondary'} className="text-[10px] h-4 font-bold">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" asChild title="查看病历轴">
                      <Link href={`/patients/${p.archiveNo}`}><Activity className="size-4 text-primary" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" title="编辑资料" onClick={() => { setEditingPatient(p); form.reset({ ...p, id: p.archiveNo }); }}>
                      <Edit className="size-4 text-primary" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2">批量导入档案</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-3 border">
              <p className="font-bold text-primary flex items-center gap-2 uppercase tracking-wider">字段填写指引</p>
              <ScrollArea className="h-40 pr-3">
                <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                  <div className="p-2 bg-red-100/50 rounded border border-red-200">
                    <p className="font-bold text-destructive mb-1 flex items-center gap-1 text-[10px]">
                      <AlertCircle className="size-3" /> 乱码解决提示：
                    </p>
                    <p className="text-[10px] leading-relaxed text-destructive/80">
                      如果您使用 WPS 或 Excel 编辑后出现乱码，请选择保存类型为：<span className="font-black">“CSV UTF-8 (逗号分隔) (*.csv)”</span>。
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    <span className="font-bold text-foreground">必填项：</span>档案编号, 姓名, 电话
                  </p>
                </div>
              </ScrollArea>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full gap-2 border-dashed h-12" onClick={downloadTemplate}>
                <Download className="size-4" /> 下载导入模板 (.csv)
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleCsvImport} className="hidden" accept=".csv" />
              <Button className="w-full h-12 gap-2 bg-primary shadow-lg font-bold" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" /> 选择并上传文件
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingNew || !!editingPatient} onOpenChange={(o) => { if(!o) {setIsAddingNew(false); setEditingPatient(null); }}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-bold">{isAddingNew ? "手动录入档案" : "编辑患者基本资料"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <FormField control={form.control} name="id" render={({ field }) => (
                  <FormItem className="col-span-full"><FormLabel className="text-xs font-bold text-muted-foreground uppercase">档案编号</FormLabel><FormControl><Input {...field} className="h-9 text-sm font-mono" disabled={!!editingPatient} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">姓名</FormLabel><FormControl><Input {...field} className="h-9 text-sm" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="idNumber" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">身份证号 (18位)</FormLabel><FormControl><Input maxLength={18} {...field} className="h-9 text-sm font-mono" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase">性别</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="男">男</SelectItem><SelectItem value="女">女</SelectItem><SelectItem value="其他">其他</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">当前年龄</FormLabel><FormControl><Input type="number" {...field} className="h-9 text-sm" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase">联系电话</FormLabel><FormControl><Input {...field} className="h-9 text-sm" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase">账户状态</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="正常">正常</SelectItem><SelectItem value="死亡">死亡 (终止随访)</SelectItem><SelectItem value="无法联系">无法联系</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="organization" render={({ field }) => (
                  <FormItem className="col-span-full"><FormLabel className="text-xs font-bold text-muted-foreground uppercase">所属单位/组织</FormLabel><FormControl><Input {...field} className="h-9 text-sm" /></FormControl></FormItem>
                )} />
              </div>
              <DialogFooter className="pt-4"><Button type="submit" className="w-full h-11 font-bold shadow-md">同步修改至中心库</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
