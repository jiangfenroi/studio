
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Upload, FileText, Trash2, CheckCircle2, AlertCircle } from "lucide-react"
import { doc, collection } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"

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
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const formSchema = z.object({
  archiveNo: z.string().min(1, "档案编号不能为空"),
  examNo: z.string().length(12, "体检编号必须为12位"),
  examDate: z.string().min(1, "体检日期不能为空"),
  notifiedPerson: z.string().min(1, "被通知人不能为空"),
  category: z.enum(["A", "B"]),
  details: z.string().min(1, "详情不能为空"),
  disposalAdvice: z.string().min(1, "处置意见不能为空"),
  isHealthEducation: z.boolean().default(true),
  notifier: z.string().min(1, "通知人不能为空"),
  feedback: z.string().optional(),
  noticeDate: z.string().min(1, "通知日期不能为空"),
  noticeTime: z.string().min(1, "通知时间不能为空"),
  reportCategory: z.enum(["体检报告", "影像报告", "病理报告", "内镜报告"]).default("体检报告"),
  reportCheckDate: z.string().optional(),
})

interface AbnormalResultFormProps {
  onSuccess: (archiveNo: string) => void
}

export function AbnormalResultForm({ onSuccess }: AbnormalResultFormProps) {
  const db = useFirestore()
  const { toast } = useToast()
  const [uploadedFiles, setUploadedFiles] = React.useState<{name: string, path: string, category: string, checkDate: string}[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)
  const basePath = systemConfig?.pdfStoragePath || "//172.17.126.18/e:/pic"
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      archiveNo: "",
      examNo: "",
      examDate: "",
      notifiedPerson: "",
      category: "A",
      details: "",
      disposalAdvice: "",
      isHealthEducation: true,
      notifier: "系统管理员",
      feedback: "",
      noticeDate: format(new Date(), "yyyy-MM-dd"),
      noticeTime: format(new Date(), "HH:mm"),
      reportCategory: "体检报告",
      reportCheckDate: format(new Date(), "yyyy-MM-dd"),
    },
  })

  const watchExamNo = form.watch("examNo")
  const watchArchiveNo = form.watch("archiveNo")

  React.useEffect(() => {
    if (watchExamNo && watchExamNo.length >= 8) {
      const year = watchExamNo.substring(0, 4)
      const month = watchExamNo.substring(4, 6)
      const day = watchExamNo.substring(6, 8)
      const dateStr = `${year}-${month}-${day}`
      if (!isNaN(Date.parse(dateStr))) {
        form.setValue("examDate", dateStr)
      }
    }
  }, [watchExamNo, form])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && watchArchiveNo) {
      const category = form.getValues("reportCategory")
      const checkDate = form.getValues("reportCheckDate") || format(new Date(), "yyyy-MM-dd")
      const simulatedPath = `${basePath}/${watchArchiveNo}/${category}/${file.name}`
      setUploadedFiles(prev => [...prev, { 
        name: file.name, 
        path: simulatedPath, 
        category, 
        checkDate 
      }])
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const triggerFilePicker = () => {
    if (!watchArchiveNo) {
      toast({
        variant: "destructive",
        title: "请先填写档案编号",
        description: "PDF 文件需要按照档案编号建立存储文件夹，请先录入编号。",
      })
      return
    }
    fileInputRef.current?.click()
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const anomalyRecordId = `${values.archiveNo}_${values.examNo}`
    const anomalyRef = doc(db, `patientProfiles/${values.archiveNo}/medicalAnomalyRecords`, anomalyRecordId)
    
    // Explicitly set isNotified to false on initial registration (Duty to Inform)
    // to ensure it enters the "Pending Follow-up" list.
    setDocumentNonBlocking(anomalyRef, {
      ...values,
      id: anomalyRecordId,
      patientProfileId: values.archiveNo,
      checkupNumber: values.examNo,
      checkupDate: values.examDate,
      isNotified: false, 
      createdAt: new Date().toISOString()
    }, { merge: true })

    for (const file of uploadedFiles) {
      const fileId = `${anomalyRecordId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      const fileData = {
        id: fileId,
        patientProfileId: values.archiveNo,
        associatedRecordId: anomalyRecordId,
        fileName: file.name,
        basePath: basePath,
        fullPath: file.path,
        checkDate: file.checkDate,
        reportCategory: file.category
      }
      addDocumentNonBlocking(collection(db, "medicalReportFiles"), fileData)
    }

    onSuccess(values.archiveNo)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              基础登记信息
            </CardTitle>
            <CardDescription>请输入体检记录的核心识别与异常分类信息</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="archiveNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>档案编号</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：D1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="examNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>体检编号 (12位)</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYYMMDDXXXX" maxLength={12} {...field} />
                  </FormControl>
                  <FormDescription>前8位为日期，后4位为序号</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="examDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>体检日期</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="col-span-full border-t pt-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>异常结果类别</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col md:flex-row gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors">
                          <FormControl>
                            <RadioGroupItem value="A" />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-bold text-destructive">A类 (危急)</FormLabel>
                            <p className="text-xs text-muted-foreground">立即临床干预，否则危及生命</p>
                          </div>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors">
                          <FormControl>
                            <RadioGroupItem value="B" />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-bold text-amber-600">B类 (重要)</FormLabel>
                            <p className="text-xs text-muted-foreground">需进一步检查或医学治疗</p>
                          </div>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>异常结果详情</FormLabel>
                    <FormControl>
                      <Textarea placeholder="请输入详细的异常医学描述..." className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="disposalAdvice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>处置意见</FormLabel>
                    <FormControl>
                      <Textarea placeholder="请输入医嘱或后续处理方案..." className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              PDF 报告上传与路径管理
            </CardTitle>
            <CardDescription>上传文件将按照内网分级存储逻辑自动归档</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="reportCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>报告种类</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择报告种类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="体检报告">体检报告</SelectItem>
                        <SelectItem value="影像报告">影像报告</SelectItem>
                        <SelectItem value="病理报告">病理报告</SelectItem>
                        <SelectItem value="内镜报告">内镜报告</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reportCheckDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>检查日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="relative group">
              <div 
                onClick={triggerFilePicker}
                className={`border-dashed border-2 rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  !watchArchiveNo ? 'bg-muted/50 border-muted opacity-60' : 'bg-muted/20 border-primary/20 hover:bg-muted/40 hover:border-primary/40'
                }`}
              >
                <Upload className={`size-8 ${!watchArchiveNo ? 'text-muted-foreground' : 'text-primary'}`} />
                <div className="text-center">
                  <p className="font-medium">点击选择 PDF 文件上传</p>
                  <p className="text-xs text-muted-foreground">支持从本机文件系统选择 PDF 报告</p>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </div>
              {!watchArchiveNo && (
                <div className="flex items-center gap-1 mt-2 text-destructive text-[10px] font-medium">
                  <AlertCircle className="size-3" />
                  请先填写档案编号以确定文件归档路径
                </div>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold">待同步至内网的文件:</p>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-md animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="size-4 text-primary shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{file.path}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0 hover:bg-destructive/10" onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="size-5 text-primary" />
              初始通知记录 (告知义务)
            </CardTitle>
            <CardDescription>记录首次发现异常后的初步告知情况。注意：此步骤不代表随访结案。</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="notifiedPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>被通知人</FormLabel>
                  <FormControl>
                    <Input placeholder="姓名" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通知人</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="noticeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通知日期</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="noticeTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通知时间</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isHealthEducation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>是否健康宣教</FormLabel>
                    <FormDescription>是否已进行科普指导</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="col-span-full">
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>告知反馈</FormLabel>
                    <FormControl>
                      <Input placeholder="记录告知后的初始回应..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-10">
          <Button type="button" variant="outline" size="lg" onClick={() => form.reset()}>重置表单</Button>
          <Button type="submit" size="lg" className="px-10 gap-2 shadow-lg">
            <CheckCircle2 className="size-5" />
            保存并进入待随访列表
          </Button>
        </div>
      </form>
    </Form>
  )
}
