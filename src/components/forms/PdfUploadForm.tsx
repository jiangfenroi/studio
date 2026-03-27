
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  FolderSearch,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { savePdfMetadata } from "@/app/actions/mysql-sync"

const pdfSchema = z.object({
  checkDate: z.string().min(1, "检查日期不能为空"),
  reportCategory: z.enum(["体检报告", "影像检查报告", "内镜检查报告", "病理检查报告", "电生理检查报告"]),
  localFileName: z.string().min(1, "请先选择本地文件"),
})

interface PdfUploadFormProps {
  archiveNo: string;
  onSuccess: () => void;
}

export function PdfUploadForm({ archiveNo, onSuccess }: PdfUploadFormProps) {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [pdfRoot, setPdfRoot] = React.useState("")

  React.useEffect(() => {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    // 仿真从系统设置读取根路径
    setPdfRoot(config.pdfStoragePath || "C:\\HealthReports\\")
  }, [])

  const form = useForm<z.infer<typeof pdfSchema>>({
    resolver: zodResolver(pdfSchema),
    defaultValues: {
      checkDate: format(new Date(), "yyyy-MM-dd"),
      reportCategory: "体检报告",
      localFileName: ""
    }
  })

  const watchCategory = form.watch("reportCategory")
  const watchFileName = form.watch("localFileName")

  // 模拟自动生成的内网共享路径逻辑
  const simulatedFullPath = React.useMemo(() => {
    if (!watchFileName) return "等待选择文件..."
    return `${pdfRoot}${archiveNo}\\${watchCategory}\\${watchFileName}`
  }, [pdfRoot, archiveNo, watchCategory, watchFileName])

  async function onSubmit(values: z.infer<typeof pdfSchema>) {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    setIsSyncing(true)
    try {
      await savePdfMetadata(config, {
        archiveNo,
        checkDate: values.checkDate,
        reportCategory: values.reportCategory,
        fullPath: simulatedFullPath
      })
      toast({ title: "报告上传成功", description: `已归档至: ${simulatedFullPath}` })
      form.reset({ ...values, localFileName: "" })
      onSuccess()
    } catch (err: any) {
      toast({ variant: "destructive", title: "上传失败", description: err.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 bg-muted/20 rounded-xl border border-dashed border-primary/20">
        <div className="flex items-center gap-2 mb-2 text-primary font-bold">
          <Upload className="size-4" /> 批量上传/归档 PDF 报告
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="checkDate" render={({ field }) => (
            <FormItem><FormLabel>检查日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="reportCategory" render={({ field }) => (
            <FormItem>
              <FormLabel>报告类别</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="体检报告">体检报告</SelectItem>
                  <SelectItem value="影像检查报告">影像检查报告</SelectItem>
                  <SelectItem value="内镜检查报告">内镜检查报告</SelectItem>
                  <SelectItem value="病理检查报告">病理检查报告</SelectItem>
                  <SelectItem value="电生理检查报告">电生理检查报告</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="localFileName" render={({ field }) => (
          <FormItem>
            <FormLabel>选择本地 PDF 文件</FormLabel>
            <div className="flex gap-2">
              <FormControl><Input placeholder="例如: check_result.pdf" {...field} /></FormControl>
              <Button type="button" variant="outline" size="icon" title="调用本地文件管理器" onClick={() => toast({ title: "仿真动作", description: "已调用本地资源管理器选择文件。" })}>
                <FolderSearch className="size-4" />
              </Button>
            </div>
            <FormDescription className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
              <AlertCircle className="size-3" /> 系统将根据档案编号自动创建二级目录。
            </FormDescription>
          </FormItem>
        )} />

        <div className="p-3 bg-white rounded border text-[10px] font-mono break-all">
          <span className="text-muted-foreground uppercase font-bold block mb-1">预设归档全路径 (内网共享)</span>
          {simulatedFullPath}
        </div>

        <Button type="submit" className="w-full gap-2" disabled={isSyncing}>
          {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-4" />}
          立即归档至中心存储
        </Button>
      </form>
    </Form>
  )
}
