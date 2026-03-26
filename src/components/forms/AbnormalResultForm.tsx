
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Upload, FileText, Trash2, CheckCircle2, Loader2 } from "lucide-react"
import { doc } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { syncAnomalyToMysql, fetchStaffMembers } from "@/app/actions/mysql-sync"

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

const formSchema = z.object({
  archiveNo: z.string().min(1, "档案编号不能为空"),
  examNo: z.string().length(12, "体检编号必须为12位"),
  examDate: z.string().min(1, "体检日期不能为空"),
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
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [staff, setStaff] = React.useState<any[]>([])

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)

  React.useEffect(() => {
    if (systemConfig?.mysql) {
      fetchStaffMembers(systemConfig.mysql).then(setStaff)
    }
  }, [systemConfig])

  const currentStaff = React.useMemo(() => staff.find(s => s.email === user?.email), [staff, user])
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      archiveNo: "",
      examNo: "",
      examDate: "",
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
    if (currentStaff?.name) {
      form.setValue("notifier", currentStaff.name)
    }
  }, [currentStaff, form])

  const watchExamNo = form.watch("examNo")
  React.useEffect(() => {
    if (watchExamNo && watchExamNo.length >= 8) {
      const dateStr = `${watchExamNo.substring(0, 4)}-${watchExamNo.substring(4, 6)}-${watchExamNo.substring(6, 8)}`
      if (!isNaN(Date.parse(dateStr))) form.setValue("examDate", dateStr)
    }
  }, [watchExamNo, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!systemConfig?.mysql) return
    setIsSyncing(true)
    
    const anomalyRecordId = `${values.archiveNo}_${values.examNo}_${Date.now().toString().slice(-4)}`
    const finalRecord = {
      ...values,
      id: anomalyRecordId,
      patientProfileId: values.archiveNo,
      checkupNumber: values.examNo,
      checkupDate: values.examDate,
      isClosed: false,
      createdAt: new Date().toISOString()
    };

    try {
      // 仅向 MySQL 同步
      await syncAnomalyToMysql(systemConfig.mysql, finalRecord, 'SAVE');
      toast({ title: "登记成功", description: "数据已保存至中心数据库。" });
      onSuccess(values.archiveNo)
    } catch (err: any) {
      toast({ variant: "destructive", title: "同步失败", description: err.message });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2"><FileText className="size-5" /> 1. 异常发现登记</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="archiveNo" render={({ field }) => (
              <FormItem><FormLabel>档案编号</FormLabel><FormControl><Input placeholder="D123..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="examNo" render={({ field }) => (
              <FormItem><FormLabel>体检编号</FormLabel><FormControl><Input maxLength={12} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="examDate" render={({ field }) => (
              <FormItem><FormLabel>日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <div className="col-span-full border-t pt-4">
              <FormField control={form.control} name="anomalyCategory" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>异常类别</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-lg flex-1">
                        <FormControl><RadioGroupItem value="A" /></FormControl>
                        <FormLabel className="font-bold text-destructive">A类 (危急)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-lg flex-1">
                        <FormControl><RadioGroupItem value="B" /></FormControl>
                        <FormLabel className="font-bold text-amber-600">B类 (重要)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <FormField className="col-span-full" control={form.control} name="anomalyDetails" render={({ field }) => (
              <FormItem className="col-span-full"><FormLabel>异常详情</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
            )} />
            <FormField className="col-span-full" control={form.control} name="disposalSuggestions" render={({ field }) => (
              <FormItem className="col-span-full"><FormLabel>处置建议</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
            )} />
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-primary/5"><CardTitle>2. 告知情况</CardTitle></CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="notifiedPerson" render={({ field }) => (
              <FormItem><FormLabel>被告知人</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="notifier" render={({ field }) => (
              <FormItem><FormLabel>告知人</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="isNotified" render={({ field }) => (
              <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                <FormLabel>确认告知</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" size="lg" className="px-10 gap-2" disabled={isSyncing}>
            {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            保存并下一步
          </Button>
        </div>
      </form>
    </Form>
  )
}
