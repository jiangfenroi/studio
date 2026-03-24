
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Upload, FileText, Trash2, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
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
import { Badge } from "@/components/ui/badge"

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
  // File upload metadata
  reportCategory: z.enum(["体检报告", "影像报告", "病理报告", "内镜报告"]).default("体检报告"),
  reportCheckDate: z.string().optional(),
})

interface AbnormalResultFormProps {
  onSuccess: (archiveNo: string) => void
}

export function AbnormalResultForm({ onSuccess }: AbnormalResultFormProps) {
  const [uploadedFiles, setUploadedFiles] = React.useState<{name: string, path: string}[]>([])
  
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
      const simulatedPath = `//172.17.126.18/e:/pic/${watchArchiveNo}/${category}/${file.name}`
      setUploadedFiles(prev => [...prev, { name: file.name, path: simulatedPath }])
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Saving abnormal result with linked files:", { ...values, files: uploadedFiles })
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
              <div className="border-dashed border-2 rounded-lg p-8 bg-muted/20 flex flex-col items-center justify-center gap-2 cursor-pointer group-hover:bg-muted/40 transition-colors">
                <Upload className="size-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">点击选择 PDF 文件上传</p>
                  <p className="text-xs text-muted-foreground">支持批量上传，文件将自动同步至内网存储</p>
                </div>
                <Input 
                  type="file" 
                  accept=".pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                  disabled={!watchArchiveNo}
                />
              </div>
              {!watchArchiveNo && <p className="text-[10px] text-destructive mt-1">请先填写档案编号以确定存储路径</p>}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold">待同步文件列表:</p>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-md">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-primary" />
                      <div>
                        <p className="text-xs font-bold">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{file.path}</p>
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

        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="size-5 text-primary" />
              通知与处置状态
            </CardTitle>
            <CardDescription>记录对患者的通知情况与反馈</CardDescription>
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
              name="isNotified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>是否通知</FormLabel>
                    <FormDescription>是否已告知</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
                    <FormLabel>被通知人反馈</FormLabel>
                    <FormControl>
                      <Input placeholder="记录被通知人的回应内容..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-10">
          <Button type="button" variant="outline" size="lg">重置表单</Button>
          <Button type="submit" size="lg" className="px-10 gap-2">
            <CheckCircle2 className="size-5" />
            保存登记信息
          </Button>
        </div>
      </form>
    </Form>
  )
}
