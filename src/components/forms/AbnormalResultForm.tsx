
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, addDays } from "date-fns"
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveAnomalyResult } from "@/app/actions/mysql-sync"

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
})

interface AbnormalResultFormProps {
  onSuccess: (archiveNo: string) => void
}

export function AbnormalResultForm({ onSuccess }: AbnormalResultFormProps) {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)

  const [currentUserName, setCurrentUserName] = React.useState("")
  React.useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('staff_user') || '{}')
    if (user.name) setCurrentUserName(user.name)
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      archiveNo: "",
      checkupNumber: "",
      checkupDate: "",
      notifiedPerson: "",
      anomalyCategory: "A",
      anomalyDetails: "",
      disposalSuggestions: "",
      isNotified: true,
      isHealthEducationProvided: true,
      notifier: "",
      notifiedPersonFeedback: "",
      notificationDate: format(new Date(), "yyyy-MM-dd"),
      notificationTime: format(new Date(), "HH:mm"),
    },
  })

  React.useEffect(() => {
    if (currentUserName) form.setValue("notifier", currentUserName)
  }, [currentUserName, form])

  const watchCheckupNo = form.watch("checkupNumber")
  React.useEffect(() => {
    if (watchCheckupNo && watchCheckupNo.length >= 8) {
      const year = watchCheckupNo.substring(0, 4)
      const month = watchCheckupNo.substring(4, 6)
      const day = watchCheckupNo.substring(6, 8)
      const dateStr = `${year}-${month}-${day}`
      if (!isNaN(Date.parse(dateStr))) {
        form.setValue("checkupDate", dateStr)
      }
    }
  }, [watchCheckupNo, form])

  const watchNotifyDate = form.watch("notificationDate")
  const nextFollowUpDate = React.useMemo(() => {
    if (!watchNotifyDate) return ""
    try {
      const date = new Date(watchNotifyDate)
      return format(addDays(date, 7), "yyyy-MM-dd")
    } catch {
      return ""
    }
  }, [watchNotifyDate])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    setIsSyncing(true)
    try {
      await saveAnomalyResult(config, values)
      toast({ title: "登记成功", description: "记录已同步至 MySQL，已生成 7 日随访任务。" })
      onSuccess(values.archiveNo)
    } catch (err: any) {
      toast({ variant: "destructive", title: "登记失败", description: err.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> 重要异常结果登记 (功能一)</CardTitle>
            <CardDescription>按照业务逻辑，保存后将自动进入个人信息补录页面。</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="archiveNo" render={({ field }) => (
              <FormItem><FormLabel>档案编号</FormLabel><FormControl><Input placeholder="D123..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="checkupNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>体检编号 (12位)</FormLabel>
                <FormControl><Input maxLength={12} placeholder="YYYYMMDDxxxx" {...field} /></FormControl>
                <FormDescription className="text-[10px]">前8位自动识别为体检日期</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="checkupDate" render={({ field }) => (
              <FormItem><FormLabel>体检日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="anomalyCategory" render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>异常结果种类</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <FormControl><RadioGroupItem value="A" /></FormControl>
                      <FormLabel className="font-bold text-destructive">A类 (危急干预)</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <FormControl><RadioGroupItem value="B" /></FormControl>
                      <FormLabel className="font-bold text-amber-600">B类 (进一步检查)</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="anomalyDetails" render={({ field }) => (
              <FormItem className="col-span-full"><FormLabel>重要异常结果详情</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="disposalSuggestions" render={({ field }) => (
              <FormItem className="col-span-full"><FormLabel>处置意见</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-dashed">
              <div className="space-y-4">
                <h4 className="font-bold text-sm flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> 告知详情录入</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="notifier" render={({ field }) => (
                    <FormItem><FormLabel>通知人</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="notifiedPerson" render={({ field }) => (
                    <FormItem><FormLabel>被通知人</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="notificationDate" render={({ field }) => (
                    <FormItem><FormLabel>通知日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="notificationTime" render={({ field }) => (
                    <FormItem><FormLabel>通知时间</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-sm flex items-center gap-2"><AlertCircle className="size-4 text-amber-600" /> 随访任务预设</h4>
                <div className="p-4 bg-white rounded-lg border border-amber-100 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">下次随访日期 (通知+7日)</p>
                  <p className="text-2xl font-black text-amber-600">{nextFollowUpDate || "等待日期录入"}</p>
                </div>
                <div className="flex gap-4">
                  <FormField control={form.control} name="isNotified" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="text-xs">已通知</FormLabel></FormItem>
                  )} />
                  <FormField control={form.control} name="isHealthEducationProvided" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="text-xs">已宣教</FormLabel></FormItem>
                  )} />
                </div>
              </div>
            </div>

            <FormField control={form.control} name="notifiedPersonFeedback" render={({ field }) => (
              <FormItem className="col-span-full"><FormLabel>被通知人反馈</FormLabel><FormControl><Textarea placeholder="记录患者反馈..." {...field} /></FormControl></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end pb-10">
          <Button type="submit" size="lg" className="px-12 gap-2 shadow-xl" disabled={isSyncing}>
            {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-5" />}
            保存记录并前往补录个人档案
          </Button>
        </div>
      </form>
    </Form>
  )
}
