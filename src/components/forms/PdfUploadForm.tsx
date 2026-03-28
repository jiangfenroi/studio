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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { uploadPdfFile, fetchConfigFromMysql } from "@/app/actions/mysql-sync"

const pdfSchema = z.object({
  checkDate: z.string().min(1, "检查日期不能为空"),
  reportCategory: z.enum(["体检报告", "影像检查报告", "内镜检查报告", "病理检查报告", "电生理检查报告"]),
  localFileNames: z.string().min(1, "请先选择 PDF 文件以同步至磁盘"),
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
        title: "文件已就绪",
        description: `共选中 ${files.length} 个本地 PDF，准备物理归档。`
      })
    }
  }

  const watchCategory = form.watch("reportCategory")
  const watchFileNames = form.watch("localFileNames")

  const simulatedPaths = React.useMemo(() => {
    if (!watchFileNames) return ["等待选择本地文件..."]
    const files = watchFileNames.split(',').map(f => f.trim()).filter(f => f.length > 0)
    return files.map(f => `${pdfRoot}${archiveNo}\\${watchCategory}\\${f}`)
  }, [pdfRoot, archiveNo, watchCategory, watchFileNames])

  async function onSubmit(values: z.infer<typeof pdfSchema>) {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    const fileList = fileInputRef.current?.files;
    
    if (!fileList || fileList.length === 0) {
      toast({ variant: "destructive", title: "未选择文件", description: "请先通过‘选择文件’按钮选取 PDF。" });
      return;
    }

    setIsSyncing(true)
    try {
      const formData = new FormData();
      formData.append('archiveNo', archiveNo);
      formData.append('checkDate', values.checkDate);
      formData.append('reportCategory', values.reportCategory);
      
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      const res = await uploadPdfFile(config, formData);
      
      toast({ title: "物理归档成功", description: `已成功将文件写入磁盘并生成 ${fileList.length} 条索引。` })
      onSuccess(res.pdfId)
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
          <Upload className="size-4" /> 物理磁盘归档中心 (内网环境)
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
              <FormLabel>选择真实 PDF 文件</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    placeholder="请点击右侧按钮选择文件..." 
                    {...field} 
                    readOnly
                    className="bg-white/50"
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
                  className="gap-2 shrink-0 h-10 px-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderSearch className="size-4" /> 选择文件
                </Button>
              </div>
              <FormDescription className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="size-3" /> 归档后，文件将物理复制到服务器磁盘的指定文件夹中。
              </FormDescription>
            </FormItem>
          )} />

          <div className="bg-white rounded-lg border p-4 shadow-inner space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase border-b pb-1 flex items-center gap-2">
              <Files className="size-3" /> 最终物理保存路径预览
            </p>
            <div className="max-h-[100px] overflow-y-auto">
              {simulatedPaths.map((p, i) => (
                <div key={i} className="text-[10px] font-mono break-all text-primary py-1 border-b last:border-0 border-muted/50">
                  <span className="opacity-50 mr-2">{i+1}.</span>{p}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full h-11 shadow-lg bg-primary hover:bg-primary/90 text-white font-bold" disabled={isSyncing}>
          {isSyncing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
          立即物理同步至磁盘并保存索引
        </Button>
      </form>
    </Form>
  )
}
