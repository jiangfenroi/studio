"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { FileText, CheckCircle2, Loader2, Upload, Link as LinkIcon, CalendarDays, MessageSquareText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveAnomalyResult, updateAnomalyResult } from "@/app/actions/mysql-sync"
import { PdfUploadForm } from "./PdfUploadForm"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const formSchema = z.object({
  archiveNo: z.string().min(1, "档案编号不能为空"),
  checkupNumber: z.string().length(12, "体检编号必须为12位"),
  checkupDate: z.string().min(1, "体检日期不能为空"),
  notifiedPerson: z.string().min(1, "被通知人不能为空"),
  anomalyCategory: z.enum(["A", "B"]),
  anomalyDetails: z.string().min(1, "详情不能为空"),
  disposalSuggestions: z.string().min(1, "处置意见不能为空"),
  isNotified: z.boolean().default(true),
  isHealthEducationProvided: z.boolean().default(true),
  notifier: z.string().min(1, "通知人不能为空"),
  notifiedPersonFeedback: z.string().optional(),
  notificationDate: z.string().min(1, "通知日期不能为空"),
  notificationTime: z.string().min(1, "通知时间不能为空"),
  pdfId: z.string().optional(),
})

interface AbnormalResultFormProps {
  onSuccess: (archiveNo: string) => void;
  initialData?: any;
  readOnly?: boolean;
}

export function AbnormalResultForm({ onSuccess, initialData, readOnly = false }: AbnormalResultFormProps) {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isPdfDialogOpen, setIsPdfDialogOpen] = React.useState(false)

  const [currentUserName, setCurrentUserName] = React.useState("")
  React.useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('staff_user') || '{}')
    if (user.name) setCurrentUserName(user.name)
  }, [])

  const defaultValues = React.useMemo(() => {
    if (!initialData) {
      return {
        archiveNo: "",
        checkupNumber: "",
        checkupDate: "",
        notifiedPerson: "",
        anomalyCategory: "A" as const,
        anomalyDetails: "",
        disposalSuggestions: "",
        isNotified: true,
        isHealthEducationProvided: true,
        notifier: currentUserName,
        notifiedPersonFeedback: "",
        notificationDate: format(new Date(), "yyyy-MM-dd"),
        notificationTime: format(new Date(), "HH:mm"),
        pdfId: "",
      }
    }

    return {
      ...initialData,
      archiveNo: initialData.archiveNo ?? "",
      checkupNumber: initialData.checkupNumber ?? "",
      checkupDate: initialData.checkupDate ?? "",
      notifiedPerson: initialData.notifiedPerson ?? "",
      anomalyCategory: (initialData.anomalyCategory as "A" | "B") ?? "A",
      anomalyDetails: initialData.anomalyDetails ?? "",
      disposalSuggestions: initialData.disposalSuggestions ?? "",
      isNotified: initialData.isNotified === 1 || initialData.isNotified === true,
      isHealthEducationProvided: initialData.isHealthEducationProvided === 1 || initialData.isHealthEducationProvided === true,
      notifier: initialData.notifier ?? currentUserName,
      notifiedPersonFeedback: initialData.notifiedPersonFeedback ?? "",
      notificationDate: initialData.notificationDate ?? "",
      notificationTime: initialData.notificationTime ?? "",
      pdfId: initialData.pdfId ?? "",
    }
  }, [initialData, currentUserName])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const watchCheckupNo = form.watch("checkupNumber")
  React.useEffect(() => {
    if (!initialData && watchCheckupNo && watchCheckupNo.length >= 8) {
      const year = watchCheckupNo.substring(0, 4)
      const month = watchCheckupNo.substring(4, 6)
      const day = watchCheckupNo.substring(6, 8)
      const dateStr = `${year}-${month}-${day}`
      if (!isNaN(Date.parse(dateStr))) form.setValue("checkupDate", dateStr)
    }
  }, [watchCheckupNo, form, initialData])

  const watchArchiveNo = form.watch("archiveNo")
  const watchNotificationDate = form.watch("notificationDate")

  const nextFollowUpDateDisplay = React.useMemo(() => {
    if (!watchNotificationDate) return "待选告知日期"
    try {
      const date = new Date(watchNotificationDate)
      if (isNaN(date.getTime())) return "日期格式有误"
      date.setDate(date.getDate() + 7)
      return format(date, "yyyy-MM-dd")
    } catch (e) {
      return "计算异常"
    }
  }, [watchNotificationDate])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (readOnly) return
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    setIsSyncing(true)
    try {
      if (initialData?.id) {
        await updateAnomalyResult(config, initialData.id, values)
        toast({ title: "修改成功" })
      } else {
        await saveAnomalyResult(config, values)
        toast({ title: "登记成功", description: `记录已保存，已自动生成 ${nextFollowUpDateDisplay} 随访任务。` })
      }
      onSuccess(values.archiveNo)
    } catch (err: any) {
      toast({ variant: "destructive", title: "操作失败", description: err.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-sm border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 py-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="size-5 text-primary" /> 
              {readOnly ? '临床记录追溯' : initialData ? '修改记录详情' : '重要异常结果登记'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormField control={form.control} name="archiveNo" render={({ field }) => (
              <FormItem><FormLabel className="text-xs font-semibold text-muted-foreground uppercase">档案编号</FormLabel><FormControl><Input placeholder="D123..." {...field} className="h-9 text-sm" disabled={!!initialData || readOnly} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="checkupNumber" render={({ field }) => (
              <FormItem><FormLabel className="text-xs font-semibold text-muted-foreground uppercase">体检编号</FormLabel><FormControl><Input maxLength={12} {...field} className="h-9 text-sm font-mono" disabled={readOnly} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="checkupDate" render={({ field }) => (
              <FormItem><FormLabel className="text-xs font-semibold text-muted-foreground uppercase">体检日期</FormLabel><FormControl><Input type="date" {...field} className="h-9 text-sm" disabled={readOnly} /></FormControl></FormItem>
            )} />
            
            <FormField control={form.control} name="anomalyCategory" render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase">异常结果种类</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4" disabled={readOnly}>
                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <FormControl><RadioGroupItem value="A" /></FormControl>
                      <FormLabel className="font-bold text-destructive text-sm cursor-pointer">A类 (危急干预)</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <FormControl><RadioGroupItem value="B" /></FormControl>
                      <FormLabel className="font-bold text-primary text-sm cursor-pointer">B类 (进一步检查)</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="anomalyDetails" render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase">医学发现/异常详情</FormLabel>
                <FormControl><Textarea {...field} className="min-h-[140px] text-sm leading-relaxed" disabled={readOnly} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="disposalSuggestions" render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase">临床处置意见</FormLabel>
                <FormControl><Textarea {...field} className="min-h-[100px] text-sm leading-relaxed" disabled={readOnly} /></FormControl>
              </FormItem>
            )} />

            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-dashed border-primary/20">
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> 告知与反馈状态
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="notifier" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold">通知人</FormLabel><FormControl><Input {...field} className="h-9 text-sm" disabled={readOnly} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="notifiedPerson" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold">被通知人</FormLabel><FormControl><Input {...field} className="h-9 text-sm" disabled={readOnly} /></FormControl></FormItem>
                  )} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                  <Upload className="size-4" /> 原始报告关联 (PDF)
                </h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <FormField control={form.control} name="pdfId" render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <LinkIcon className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
                            <Input placeholder="尚未关联报告编号" {...field} readOnly className="pl-9 h-9 text-sm bg-white" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )} />
                    {!readOnly && (
                      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="h-9 gap-2 shadow-sm" disabled={!watchArchiveNo}>
                            <Upload className="size-4" /> 上传
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader><DialogTitle>归档当前异常结果的原始 PDF 报告</DialogTitle></DialogHeader>
                          <PdfUploadForm archiveNo={watchArchiveNo} onSuccess={(id) => { form.setValue("pdfId", id); setIsPdfDialogOpen(false); }} />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  {form.watch("pdfId") && (
                    <Badge variant="secondary" className="w-fit gap-1.5 py-1 px-3 bg-green-50 text-green-700 border-green-200 text-[10px] font-bold">
                      <CheckCircle2 className="size-3" /> 已关联 ID: {form.watch("pdfId")}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="col-span-full border-t border-primary/10 pt-4">
                <FormField control={form.control} name="notifiedPersonFeedback" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold flex items-center gap-1">
                      <MessageSquareText className="size-3 text-muted-foreground" /> 被通知人反馈内容
                    </FormLabel>
                    <FormControl><Textarea placeholder="输入患者或家属的反馈信息..." className="min-h-[80px] text-sm leading-relaxed bg-white" {...field} disabled={readOnly} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="col-span-full grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-2">
              <FormField control={form.control} name="notificationDate" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-bold">通知日期</FormLabel><FormControl><Input type="date" {...field} className="h-9 text-sm" disabled={readOnly} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="notificationTime" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-bold">通知时间</FormLabel><FormControl><Input type="time" {...field} className="h-9 text-sm" disabled={readOnly} /></FormControl></FormItem>
              )} />
              
              <div className="space-y-1.5">
                <FormLabel className="text-primary font-black text-[10px] uppercase flex items-center gap-1">
                  下次随访任务 (预设+7日)
                </FormLabel>
                <div className="flex items-center gap-2 h-9 px-3 bg-primary/5 border border-primary/20 rounded-md text-primary font-bold text-xs shadow-inner">
                  <CalendarDays className="size-4 opacity-70" />
                  {nextFollowUpDateDisplay}
                </div>
              </div>

              <div className="flex items-center gap-6 pb-2 h-9 justify-end">
                <FormField control={form.control} name="isNotified" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} className="scale-75" /></FormControl><FormLabel className="text-[10px] font-bold">已告知</FormLabel></FormItem>
                )} />
                <FormField control={form.control} name="isHealthEducationProvided" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} className="scale-75" /></FormControl><FormLabel className="text-[10px] font-bold">已宣教</FormLabel></FormItem>
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        {!readOnly && (
          <div className="flex justify-end gap-4 pb-10">
            <Button type="submit" size="lg" className="px-12 shadow-md bg-primary hover:bg-primary/90 text-white font-bold h-12" disabled={isSyncing}>
              {isSyncing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="size-5 mr-2" />}
              {initialData ? '保存修改并同步' : '完成登记并同步库'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
