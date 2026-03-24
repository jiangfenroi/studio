
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { User, Calendar, Clock, Upload, FileType, CheckCircle2, Trash2, FileText } from "lucide-react"
import { doc, collection, addDoc } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"

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
import { Badge } from "@/components/ui/badge"

const formSchema = z.object({
  archiveNo: z.string(),
  followUpResult: z.string().min(1, "随访结果不能为空"),
  followUpPerson: z.string().min(1, "回访人不能为空"),
  followUpDate: z.string().min(1, "回访日期不能为空"),
  followUpTime: z.string().min(1, "回访时间不能为空"),
  isReExamined: z.boolean().default(false),
  fileExamDate: z.string().optional(),
  fileCategory: z.enum(["体检报告", "影像报告", "病理报告", "内镜报告"]).default("影像报告"),
  nextFollowUpSetting: z.string().optional(),
})

interface FollowUpFormProps {
  archiveNo: string;
  patientName: string;
  onSuccess: () => void;
}

export function FollowUpForm({ archiveNo, patientName, onSuccess }: FollowUpFormProps) {
  const db = useFirestore()
  const [uploadedFiles, setUploadedFiles] = React.useState<{name: string, path: string, category: string, checkDate: string}[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch system config for storage path
  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)
  const basePath = systemConfig?.pdfStoragePath || "//172.17.126.18/e:/pic"

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      archiveNo: archiveNo,
      followUpResult: "",
      followUpPerson: "管理员",
      followUpDate: format(new Date(), "yyyy-MM-dd"),
      followUpTime: format(new Date(), "HH:mm"),
      isReExamined: false,
      nextFollowUpSetting: "none",
      fileCategory: "影像报告",
      fileExamDate: format(new Date(), "yyyy-MM-dd"),
    },
  })

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // 1. Create FollowUp Record
    const recordId = `${archiveNo}_followup_${Date.now()}`
    const followUpRef = collection(db, `patientProfiles/${archiveNo}/medicalAnomalyRecords`) // In a real app we would link to a specific record
    
    // 2. Create File Metadata Records
    for (const file of uploadedFiles) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      const fileData = {
        id: fileId,
        patientProfileId: archiveNo,
        associatedRecordId: recordId,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5">档案编号: {archiveNo}</Badge>
            <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5">患者姓名: {patientName}</Badge>
          </div>
        </div>

        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="size-5 text-primary" />
              随访登记信息
            </CardTitle>
            <CardDescription>记录对患者的随访情况与反馈</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField control={form.control} name="followUpPerson" render={({ field }) => (
              <FormItem><FormLabel>回访人</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="followUpDate" render={({ field }) => (
              <FormItem><FormLabel>回访日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="followUpTime" render={({ field }) => (
              <FormItem><FormLabel>回访时间</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="col-span-full">
              <FormField control={form.control} name="followUpResult" render={({ field }) => (
                <FormItem>
                  <FormLabel>回访结果</FormLabel>
                  <FormControl><Textarea placeholder="请输入详细的随访结果描述..." className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="isReExamined" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm lg:col-span-1">
                <div className="space-y-0.5"><FormLabel>是否复查/病历检查</FormLabel><FormDescription>患者是否已进行后续检查</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="nextFollowUpSetting" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>设置下次随访</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="选择随访间隔" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">暂不设置</SelectItem>
                    <SelectItem value="1m">1个月后</SelectItem>
                    <SelectItem value="3m">3个月后</SelectItem>
                    <SelectItem value="6m">半年后</SelectItem>
                    <SelectItem value="1y">1年后</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>指定时间后自动重新列入待随访列表</FormDescription>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              随访相关 PDF 附件归档
            </CardTitle>
            <CardDescription>按照内网“档案/种类”分级逻辑自动存储</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <FormField control={form.control} name="fileExamDate" render={({ field }) => (
                <FormItem><FormLabel>检查日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="fileCategory" render={({ field }) => (
                <FormItem>
                  <FormLabel>报告类别</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="选择报告类别" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="体检报告">体检报告</SelectItem>
                      <SelectItem value="影像报告">影像报告</SelectItem>
                      <SelectItem value="病理报告">病理报告</SelectItem>
                      <SelectItem value="内镜报告">内镜报告</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div 
              onClick={triggerFilePicker}
              className="relative group border-dashed border-2 rounded-lg p-10 bg-muted/20 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <FileType className="size-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-medium">点击或拖拽后续检查报告 PDF 上传</p>
                <p className="text-sm text-muted-foreground">文件将归类存储至: [共享路径]/{archiveNo}/[种类]/</p>
              </div>
              <Input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <Button type="button" variant="outline" size="sm">选择文件</Button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-bold">待上传报告:</p>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-md">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-primary" />
                      <div>
                        <p className="text-xs font-bold">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[400px]">{file.path}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-10">
          <Button type="button" variant="outline" size="lg">取消</Button>
          <Button type="submit" size="lg" className="px-10 gap-2">
            <CheckCircle2 className="size-5" />
            完成结案
          </Button>
        </div>
      </form>
    </Form>
  )
}
