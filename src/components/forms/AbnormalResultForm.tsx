
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

  // 从会话获取当前登录人姓名
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

  // 监听通知人初始化
  React.useEffect(() => {
    if (currentUserName) form.setValue("notifier", currentUserName)
  }, [currentUserName, form])

  // 监听体检编号，自动提取体检日期
  const watchCheckupNo = form.watch("checkupNumber")
  React.useEffect(() => {
    if (watchCheckupNo && watchCheckupNo.length >= 8) {
      const year = watchCheckupNo.substring(0, 4)
      const month = watchCheckupNo.substring(4, 6)
      const day = watchCheckupNo.substring(6, 8)
      const dateStr = `${year}-${month}-${day}`
      // 验证日期合法性
      if (!isNaN(Date.parse(dateStr))) {
        form.setValue("checkupDate", dateStr)
      }
    }
  }, [watchCheckupNo, form])

  // 计算下次随访日期 (通知日期 + 7天)
  const watchNotifyDate = form.watch("notificationDate")
  const nextFollowUpDate = React.useMemo(() => {
    if (!watchNotifyDate) return "请先输入通知日期"
    try {
      const date = new Date(watchNotifyDate)
      return format(addDays(date, 7), "yyyy-MM-dd")
    } catch {
      return "日期格式错误"
    }
  }, [watchNotifyDate])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    if (!config.host) {
      toast({ variant: "destructive", title: "配置错误", description: "请先在登录页配置 MySQL 连接。" })
      return
    }

    setIsSyncing(true)
    try {
      await saveAnomalyResult(config, values)
      toast({ title: "登记成功", description: "记录已保存并已生成 7 日随访任务。" })
      onSuccess(values.archiveNo)
    } catch (err: any) {
      toast({ variant: "destructive", title: "同步失败", description: err.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> 重要异常结果登记 (Step 1)</CardTitle>
            <CardDescription>录入临床发现及初步告知反馈，系统将自动锁定 7 日后随访任务。</CardDescription>
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
            
            <div className="col-span-full space-y-4">
              <FormField control={form.control} name="anomalyCategory" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>异常结果种类</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col md:flex-row gap-4">
                      <FormItem className="flex items-start space-x-3 space-y-0 p-4 border rounded-xl flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                        <FormControl><RadioGroupItem value="A" /></FormControl>
                        <div className="space-y-1">
                          <FormLabel className="font-bold text-destructive">A类 (危急干预)</FormLabel>
                          <p className="text-[10px] text-muted-foreground">需要立即临床干预，否则将危及生命或导致严重不良后果。</p>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0 p-4 border rounded-xl flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                        <FormControl><RadioGroupItem value="B" /></FormControl>
                        <div className="space-y-1">
                          <FormLabel className="font-bold text-amber-600">B类 (进一步检查)</FormLabel>
                          <p className="text-[10px] text-muted-foreground">需要进一步检查以明确诊断和/或需要医学治疗。</p>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )} />
            </div>

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
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="p-4 bg-white rounded-lg border border-amber-100 space-y-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">基于通知日期自动计算 (不可修改):</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">下次随访日期:</span>
                    <Badge variant="secondary" className="text-sm bg-amber-50 text-amber-700 px-3">{nextFollowUpDate}</Badge>
                  </div>
                  <p className="text-[10px] text-amber-500">提示：系统将在 7 日后自动将该档案推入“待随访”任务池。</p>
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
              <FormItem className="col-span-full"><FormLabel>被通知人反馈</FormLabel><FormControl><Textarea placeholder="记录患者或家属的口头反馈..." {...field} /></FormControl></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end pb-10">
          <Button type="submit" size="lg" className="px-12 gap-2 shadow-xl" disabled={isSyncing}>
            {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-5" />}
            保存记录并继续补录个人信息
          </Button>
        </div>
      </form>
    </Form>
  )
}
