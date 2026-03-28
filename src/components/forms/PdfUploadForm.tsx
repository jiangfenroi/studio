
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
  AlertCircle,
  FileUp,
  Files
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
import { savePdfMetadata, fetchConfigFromMysql } from "@/app/actions/mysql-sync"

const pdfSchema = z.object({
  checkDate: z.string().min(1, "检查日期不能为空"),
  reportCategory: z.enum(["体检报告", "影像检查报告", "内镜检查报告", "病理检查报告", "电生理检查报告"]),
  localFileNames: z.string().min(1, "请先选择/输入本地文件名"),
})

interface PdfUploadFormProps {
  archiveNo: string;
  onSuccess: (pdfId: string) => void;
}

export function PdfUploadForm({ archiveNo, onSuccess }: PdfUploadFormProps) {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [pdfRoot, setPdfRoot] = React.useState("C:\\HealthReports\\")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    fetchConfigFromMysql(config).then(res => {
      if (res?.pdfStoragePath) setPdfRoot(res.pdfStoragePath)
    })
  }, [])

  const form = useForm<z.infer<typeof pdfSchema>>({
    resolver: zodResolver(pdfSchema),
    defaultValues: {
      checkDate: format(new Date(), "yyyy-MM-dd"),
      reportCategory: "体检报告",
      localFileNames: ""
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const names = Array.from(files).map(f => f.name).join(", ")
      form.setValue("localFileNames", names)
      toast({
        title: "已选择文件",
        description: `共选中 ${files.length} 个文档，准备生成内网索引。`
      })
    }
  }

  const watchCategory = form.watch("reportCategory")
  const watchFileNames = form.watch("localFileNames")

  const simulatedPaths = React.useMemo(() => {
    if (!watchFileNames) return ["等待选择文件..."]
    const files = watchFileNames.split(',').map(f => f.trim()).filter(f => f.length > 0)
    return files.map(f => `${pdfRoot}${archiveNo}\\${watchCategory}\\${f}`)
  }, [pdfRoot, archiveNo, watchCategory, watchFileNames])

  async function onSubmit(values: z.infer<typeof pdfSchema>) {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    setIsSyncing(true)
    try {
      const files = values.localFileNames.split(',').map(f => f.trim()).filter(f => f.length > 0)
      let lastPdfId = ""
      
      for (const fileName of files) {
        const fullPath = `${pdfRoot}${archiveNo}\\${values.reportCategory}\\${fileName}`
        const res = await savePdfMetadata(config, {
          archiveNo,
          checkDate: values.checkDate,
          reportCategory: values.reportCategory,
          fullPath
        })
        if (res.success) lastPdfId = res.pdfId
      }
      
      toast({ title: "报告归档成功", description: `已成功生成 ${files.length} 条 PDF 索引。` })
      onSuccess(lastPdfId)
    } catch (err: any) {
      toast({ variant: "destructive", title: "归档失败", description: err.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-5 bg-muted/20 rounded-xl border border-dashed border-primary/30">
        <div className="flex items-center gap-2 mb-2 text-primary font-bold">
          <Upload className="size-4" /> 批量报告归档中心
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

        <div className="space-y-4">
          <FormField control={form.control} name="localFileNames" render={({ field }) => (
            <FormItem>
              <FormLabel>选择本地 PDF 文件</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    placeholder="请选择文件或手动输入文件名..." 
                    {...field} 
                  />
                </FormControl>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  multiple 
                  accept=".pdf"
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="gap-2 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderSearch className="size-4" /> 选择文件
                </Button>
              </div>
              <FormDescription className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                <AlertCircle className="size-3" /> 系统将按“档案/类别/文件”逻辑自动构建共享路径。
              </FormDescription>
            </FormItem>
          )} />

          <div className="bg-white rounded-lg border p-4 shadow-inner space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase border-b pb-1 flex items-center gap-2">
              <Files className="size-3" /> 预设归档物理全路径预览
            </p>
            <div className="max-h-[120px] overflow-y-auto">
              {simulatedPaths.map((p, i) => (
                <div key={i} className="text-[10px] font-mono break-all text-primary py-1 border-b last:border-0 border-muted/50">
                  <span className="opacity-50 mr-2">{i+1}.</span>{p}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full h-11 shadow-lg bg-primary hover:bg-primary/90" disabled={isSyncing}>
          {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
          立即同步至中心 PDF 库
        </Button>
      </form>
    </Form>
  )
}
