"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, addMonths, addYears } from "date-fns"
import { 
  CheckCircle2, 
  Loader2, 
  Info, 
  Calendar as CalendarIcon,
  Upload,
  FileText
} from "lucide-react"
import { saveFollowUpRecord } from "@/app/actions/mysql-sync"
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
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PdfUploadForm } from "./PdfUploadForm"

const formSchema = z.object({
  archiveNo: z.string(),
  anomalyId: z.string(),
  followUpResult: z.string().min(1, "随访结果反馈不能为空"),
  followUpPerson: z.string().min(1, "回访人不能为空"),
  followUpDate: z.string().min(1, "回访日期不能为空"),
  followUpTime: z.string().min(1, "回访时间不能为空"),
  isReExamined: z.boolean().default(false),
  nextFollowUpInterval: z.string().min(1, "下次随访周期不能为空"),
  pdfId: z.string().optional(),
})

interface FollowUpFormProps {
  archiveNo: string;
  patientName: string;
  anomalyRecordId: string;
  onSuccess: () => void;
}

export function FollowUpForm({ archiveNo, patientName, anomalyRecordId, onSuccess }: FollowUpFormProps) {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isPdfDialogOpen, setIsPdfDialogOpen] = React.useState(false)

  const [currentUserName, setCurrentUserName] = React.useState("")
  React.useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('staff_user') || '{}')
    if (user.name) setCurrentUserName(user.name)
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      archiveNo: archiveNo,
      anomalyId: anomalyRecordId,
      followUpResult: "",
      followUpPerson: "",
      followUpDate: format(new Date(), "yyyy-MM-dd"),
      followUpTime: format(new Date(), "HH:mm"),
      isReExamined: false,
      nextFollowUpInterval: "1year",
      pdfId: "",
    },
  })

  React.useEffect(() => {
    if (currentUserName) form.setValue("followUpPerson", currentUserName)
  }, [currentUserName, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    const baseDate = new Date(values.followUpDate);
    let nextDate: Date;
    switch(values.nextFollowUpInterval) {
      case "1month": nextDate = addMonths(baseDate, 1); break;
      case "3months": nextDate = addMonths(baseDate, 3); break;
      case "6months": nextDate = addMonths(baseDate, 6); break;
      case "1year": nextDate = addYears(baseDate, 1); break;
      default: nextDate = addYears(baseDate, 1);
    }

    setIsSyncing(true)
    try {
      const payload = { ...values, nextFollowUpDate: format(nextDate, "yyyy-MM-dd") }
      await saveFollowUpRecord(config, payload)
      toast({ title: "随访成功", description: "记录已保存并同步中心 MySQL。" })
      onSuccess()
    } catch (err: any) {
      toast({ variant: "destructive", title: "同步失败", description: err.message })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="size-4 text-primary" />
          <AlertTitle className="text-primary font-bold">临床随访任务登记</AlertTitle>
          <AlertDescription className="text-xs">
            患者: <span className="font-bold">[{archiveNo}] {patientName}</span>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30 pb-4"><CardTitle className="text-lg flex items-center gap-2"><FileText className="size-4" /> 随访过程描述</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="followUpPerson" render={({ field }) => (
                  <FormItem><FormLabel>回访人</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="followUpDate" render={({ field }) => (
                  <FormItem><FormLabel>回访日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="followUpTime" render={({ field }) => (
                <FormItem><FormLabel>回访时间</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="followUpResult" render={({ field }) => (
                <FormItem><FormLabel>医学记录/回访结果</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="isReExamined" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                  <FormLabel className="m-0">是否复查/进一步检查</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-md border-none ring-1 ring-border">
              <CardHeader className="bg-amber-50/50 pb-4 border-b border-amber-100"><CardTitle className="text-lg text-amber-800 flex items-center gap-2"><CalendarIcon className="size-4" /> 下次随访计划</CardTitle></CardHeader>
              <CardContent className="pt-6">
                <FormField control={form.control} name="nextFollowUpInterval" render={({ field }) => (
                  <FormItem>
                    <FormLabel>随访周期选择</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1month">1 个月后</SelectItem>
                        <SelectItem value="3months">3 个月后</SelectItem>
                        <SelectItem value="6months">半年后</SelectItem>
                        <SelectItem value="1year">1 年后</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="shadow-md border-none ring-1 ring-border">
              <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100"><CardTitle className="text-lg text-blue-800 flex items-center gap-2"><Upload className="size-4" /> 报告索引关联</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-2">
                  <FormField control={form.control} name="pdfId" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl><Input placeholder="PDF文件编号" {...field} readOnly className="bg-muted" /></FormControl>
                    </FormItem>
                  )} />
                  <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-2"><Upload className="size-4" /> 归档报告</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader><DialogTitle>归档随访复查报告</DialogTitle></DialogHeader>
                      <PdfUploadForm archiveNo={archiveNo} onSuccess={(id) => { form.setValue("pdfId", id); setIsPdfDialogOpen(false); }} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4 pb-6">
          <Button type="submit" size="lg" className="px-12 shadow-xl" disabled={isSyncing}>
            {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-5 mr-2" />}
            完成记录并同步 MySQL
          </Button>
        </div>
      </form>
    </Form>
  )
}
