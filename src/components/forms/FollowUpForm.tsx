
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, addMonths, addYears } from "date-fns"
import { User, Calendar, Clock, Upload, FileType, CheckCircle2, Trash2, FileText, Save, Info, Stethoscope } from "lucide-react"
import { doc, collection } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, useUser, useCollection } from "@/firebase"

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
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const formSchema = z.object({
  archiveNo: z.string(),
  followUpResult: z.string().min(1, "随访结果反馈不能为空"),
  followUpPerson: z.string().min(1, "回访人不能为空"),
  followUpDate: z.string().min(1, "回访日期不能为空"),
  followUpTime: z.string().min(1, "回访时间不能为空"),
  isReExamined: z.boolean().default(false),
  fileExamDate: z.string().optional(),
  fileCategory: z.enum(["影像检查报告", "病理检查报告"]).default("影像检查报告"),
  nextFollowUpInterval: z.string().optional(),
})

interface FollowUpFormProps {
  archiveNo: string;
  patientName: string;
  anomalyRecordId: string;
  onSuccess: () => void;
}

export function FollowUpForm({ archiveNo, patientName, anomalyRecordId, onSuccess }: FollowUpFormProps) {
  const db = useFirestore()
  const { user } = useUser()
  const [uploadedFiles, setUploadedFiles] = React.useState<{name: string, path: string, category: string, checkDate: string}[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)
  const basePath = systemConfig?.pdfStoragePath || "//172.17.126.18/e:/pic"

  const staffQuery = useMemoFirebase(() => collection(db, "staffProfiles"), [db])
  const { data: staff } = useCollection(staffQuery)
  
  const currentStaff = React.useMemo(() => {
    if (!user || !staff) return null
    return staff.find(s => s.email === user.email)
  }, [user, staff])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      archiveNo: archiveNo,
      followUpResult: "",
      followUpPerson: currentStaff?.name || "临床人员",
      followUpDate: format(new Date(), "yyyy-MM-dd"),
      followUpTime: format(new Date(), "HH:mm"),
      isReExamined: false,
      nextFollowUpInterval: "none",
      fileCategory: "影像检查报告",
      fileExamDate: format(new Date(), "yyyy-MM-dd"),
    },
  })

  React.useEffect(() => {
    if (currentStaff?.name) {
      form.setValue("followUpPerson", currentStaff.name)
    }
  }, [currentStaff, form])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && archiveNo) {
      const category = form.getValues("fileCategory")
      const checkDate = form.getValues("fileExamDate") || format(new Date(), "yyyy-MM-dd")
      const simulatedPath = `${basePath}/${archiveNo}/${category}/${file.name}`
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
    fileInputRef.current?.click()
  }

  async function handleAction(shouldCloseCase: boolean) {
    const values = form.getValues()
    const isValid = await form.trigger()
    if (!isValid) return

    const interactionId = `followup_${Date.now()}`
    const followUpRef = doc(db, `patientProfiles/${archiveNo}/medicalAnomalyRecords`, interactionId)
    
    let nextFollowUpDateString = ""
    if (values.nextFollowUpInterval !== "none") {
      const baseDate = new Date()
      let nextDate: Date = baseDate
      if (values.nextFollowUpInterval === "1m") nextDate = addMonths(baseDate, 1)
      if (values.nextFollowUpInterval === "3m") nextDate = addMonths(baseDate, 3)
      if (values.nextFollowUpInterval === "6m") nextDate = addMonths(baseDate, 6)
      if (values.nextFollowUpInterval === "1y") nextDate = addYears(baseDate, 1)
      nextFollowUpDateString = format(nextDate, "yyyy-MM-dd")
    }

    // Save the follow-up interaction
    setDocumentNonBlocking(followUpRef, {
      ...values,
      id: interactionId,
      patientProfileId: archiveNo,
      associatedAnomalyId: anomalyRecordId,
      isClosureRecord: shouldCloseCase,
      createdAt: new Date().toISOString()
    }, { merge: true })

    // Update parent anomaly record to control task lifecycle
    const parentRecordRef = doc(db, `patientProfiles/${archiveNo}/medicalAnomalyRecords`, anomalyRecordId)
    updateDocumentNonBlocking(parentRecordRef, {
      isClosed: shouldCloseCase,
      nextFollowUpDate: nextFollowUpDateString,
      lastFollowUpAt: new Date().toISOString(),
      lastFollowUpResult: values.followUpResult
    })

    // Save associated files
    for (const file of uploadedFiles) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      const fileData = {
        id: fileId,
        patientProfileId: archiveNo,
        associatedRecordId: interactionId,
        fileName: file.name,
        basePath: basePath,
        fullPath: file.path,
        checkDate: file.checkDate,
        reportCategory: file.category
      }
      addDocumentNonBlocking(collection(db, "medicalReportFiles"), fileData)
    }

    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="size-4 text-primary" />
          <AlertTitle className="text-primary font-bold">临床随访登记上下文</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            正在为档案 <span className="font-bold text-foreground">[{archiveNo}] {patientName}</span> 录入随访。
            保存后，系统将自动更新任务列表状态。若选择“结案”，该异常任务将进入历史存档。
          </AlertDescription>
        </Alert>

        <Card className="shadow-md border-none ring-1 ring-border">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center gap-2">
              <Stethoscope className="size-5 text-primary" />
              随访核心反馈
            </CardTitle>
            <CardDescription>记录回访人员及具体的医疗反馈意见</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField control={form.control} name="archiveNo" render={({ field }) => (
              <FormItem>
                <FormLabel>档案编号</FormLabel>
                <FormControl><Input {...field} disabled className="bg-muted font-mono" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="followUpPerson" render={({ field }) => (
              <FormItem>
                <FormLabel>回访人 (工号/姓名)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-2">
               <FormField control={form.control} name="followUpDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>回访日期</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="followUpTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>回访时间</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="col-span-full">
              <FormField control={form.control} name="followUpResult" render={({ field }) => (
                <FormItem>
                  <FormLabel>回访结果 (详细医学描述)</FormLabel>
                  <FormControl><Textarea placeholder="请输入详细的医疗随访结果反馈..." className="min-h-[120px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="isReExamined" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/20">
                <div className="space-y-0.5"><FormLabel className="text-sm">是否复查或进一步病历检查</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="nextFollowUpInterval" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>下次随访预约 (手动设置)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择下次随访时间" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">不预约 (按常规周期计算)</SelectItem>
                    <SelectItem value="1m">1个月后</SelectItem>
                    <SelectItem value="3m">3个月后</SelectItem>
                    <SelectItem value="6m">半年后</SelectItem>
                    <SelectItem value="1y">1年后</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-[10px]">到达预约日期后，记录将自动重新进入待随访列表。</FormDescription>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card className="shadow-md border-none ring-1 ring-border">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              关联检查 PDF 文件
            </CardTitle>
            <CardDescription>上传后续影像或病理检查报告，支持录入具体的检查时间</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <FormField control={form.control} name="fileExamDate" render={({ field }) => (
                <FormItem><FormLabel>文件检查/报告日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="fileCategory" render={({ field }) => (
                <FormItem>
                  <FormLabel>文件类别</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="影像检查报告">影像检查报告</SelectItem>
                      <SelectItem value="病理检查报告">病理检查报告</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div 
              onClick={triggerFilePicker}
              className="border-dashed border-2 rounded-xl p-10 bg-primary/5 border-primary/20 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <FileType className="size-12 text-primary" />
              <p className="font-bold text-primary">选择后续检查报告上传 (PDF)</p>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{file.category} • {file.checkDate}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-10">
          <Button type="button" variant="outline" size="lg" onClick={() => handleAction(false)} className="gap-2 border-primary text-primary hover:bg-primary/5">
            <Save className="size-4" />
            仅保存记录
          </Button>
          <Button type="button" size="lg" onClick={() => handleAction(true)} className="px-12 gap-2 shadow-xl bg-primary hover:bg-primary/90">
            <CheckCircle2 className="size-5" />
            结案并同步
          </Button>
        </div>
      </form>
    </Form>
  )
}
