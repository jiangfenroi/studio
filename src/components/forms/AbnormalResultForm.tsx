
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Upload, FileText, Trash2, CheckCircle2, AlertCircle } from "lucide-react"
import { doc, collection } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, useUser, useCollection } from "@/firebase"
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
  isNotified: z.boolean().default(true),
  isHealthEducation: z.boolean().default(true),
  notifier: z.string().min(1, "通知人不能为空"),
  feedback: z.string().optional(),
  noticeDate: z.string().min(1, "通知日期不能为空"),
  noticeTime: z.string().min(1, "通知时间不能为空"),
  reportCategory: z.string().default("体检报告"),
  reportCheckDate: z.string().optional(),
})

interface AbnormalResultFormProps {
  onSuccess: (archiveNo: string) => void
}

export function AbnormalResultForm({ onSuccess }: AbnormalResultFormProps) {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [uploadedFiles, setUploadedFiles] = React.useState<{name: string, path: string, category: string, checkDate: string}[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)
  const basePath = systemConfig?.pdfStoragePath || "//172.17.126.18/e:/pic"

  // Fetch staff profile for default notifier
  const staffQuery = useMemoFirebase(() => collection(db, "staffProfiles"), [db])
  const { data: staff } = useCollection(staffQuery)
  const currentStaff = React.useMemo(() => staff?.find(s => s.email === user?.email), [staff, user])
  
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
      isNotified: true,
      isHealthEducation: true,
      notifier: currentStaff?.name || "系统管理员",
      feedback: "",
      noticeDate: format(new Date(), "yyyy-MM-dd"),
      noticeTime: format(new Date(), "HH:mm"),
      reportCategory: "体检报告",
      reportCheckDate: format(new Date(), "yyyy-MM-dd"),
    },
  })

  // Set notifier when staff profile loads
  React.useEffect(() => {
    if (currentStaff?.name) {
      form.setValue("notifier", currentStaff.name)
    }
  }, [currentStaff, form])

  const watchExamNo = form.watch("examNo")
  const watchArchiveNo = form.watch("archiveNo")

  // Auto-populate examDate from examNo
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
        description: "PDF 文件归档需要先确定档案编号路径。",
      })
      return
    }
    fileInputRef.current?.click()
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const anomalyRecordId = `${values.archiveNo}_${values.examNo}_${Date.now().toString().slice(-4)}`
    const anomalyRef = doc(db, `patientProfiles/${values.archiveNo}/medicalAnomalyRecords`, anomalyRecordId)
    
    // Initial entry ensures patient profile exists
    const patientRef = doc(db, "patientProfiles", values.archiveNo)
    setDocumentNonBlocking(patientRef, { id: values.archiveNo }, { merge: true })

    setDocumentNonBlocking(anomalyRef, {
      ...values,
      id: anomalyRecordId,
      patientProfileId: values.archiveNo,
      checkupNumber: values.examNo,
      checkupDate: values.examDate,
      createdAt: new Date().toISOString()
    }, { merge: true })

    // Save File metadata
    for (const file of uploadedFiles) {
      const fileId = `${anomalyRecordId}_file_${Date.now()}`
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
              1. 异常发现登记
            </CardTitle>
            <CardDescription>请输入体检记录核心识别信息及医学分类</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="archiveNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>档案编号 (Archive No.)</FormLabel>
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
                  <FormDescription className="text-[10px]">格式：年月日(8位) + 序号(4位)</FormDescription>
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
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex-1">
                          <FormControl><RadioGroupItem value="A" /></FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-bold text-destructive">A类 (危急结果)</FormLabel>
                            <p className="text-[10px] text-muted-foreground">需立即进行临床干预，否则危及生命</p>
                          </div>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex-1">
                          <FormControl><RadioGroupItem value="B" /></FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-bold text-amber-600">B类 (重要结果)</FormLabel>
                            <p className="text-[10px] text-muted-foreground">需进一步检查或医学治疗的重要发现</p>
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
                      <Textarea placeholder="描述医学异常发现的具体细节..." className="min-h-[120px]" {...field} />
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
                      <Textarea placeholder="记录医嘱、复查建议或临床处理方案..." className="min-h-[120px]" {...field} />
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
              2. 体检报告归档
            </CardTitle>
            <CardDescription>上传相关 PDF 报告。文件将自动存储于内网共享路径根目录下的档案文件夹。</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="reportCheckDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>检查日期 (报告时间)</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div 
              onClick={triggerFilePicker}
              className={`border-dashed border-2 rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-all ${
                !watchArchiveNo ? 'bg-muted/50 border-muted cursor-not-allowed' : 'bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40 cursor-pointer'
              }`}
            >
              <Upload className={`size-10 ${!watchArchiveNo ? 'text-muted-foreground' : 'text-primary'}`} />
              <div className="text-center">
                <p className="font-bold">点击选择 PDF 体检报告</p>
                <p className="text-xs text-muted-foreground mt-1">支持拖拽或浏览本机文件系统</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">待归档文件清单:</p>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border border-primary/10 rounded-lg animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[300px]">{file.path}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}>
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
              3. 初始告知情况
            </CardTitle>
            <CardDescription>记录临床告知义务的履行情况</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="notifiedPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>被通知人姓名</FormLabel>
                  <FormControl><Input placeholder="患者或家属姓名" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通知人 (系统账户)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
                  <FormControl><Input type="date" {...field} /></FormControl>
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
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isNotified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/20">
                  <div className="space-y-0.5"><FormLabel>是否已通知</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isHealthEducation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/20">
                  <div className="space-y-0.5"><FormLabel>是否健康宣教</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <div className="col-span-full">
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>被通知人反馈</FormLabel>
                    <FormControl><Input placeholder="记录沟通反馈结果..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-20">
          <Button type="button" variant="outline" size="lg" onClick={() => form.reset()}>清空重填</Button>
          <Button type="submit" size="lg" className="px-10 gap-2 shadow-xl bg-primary hover:bg-primary/90">
            <CheckCircle2 className="size-5" />
            保存并补充个人信息
          </Button>
        </div>
      </form>
    </Form>
  )
}
