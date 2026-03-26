
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, addMonths, addYears } from "date-fns"
import { User, Calendar, Clock, Upload, FileType, CheckCircle2, Trash2, FileText, Save, Info, Stethoscope, Loader2 } from "lucide-react"
import { doc, collection } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, useUser, useCollection } from "@/firebase"
import { syncFollowUpToMysql, syncAnomalyToMysql } from "@/app/actions/mysql-sync"

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

const formSchema = z.object({
  archiveNo: z.string(),
  followUpResult: z.string().min(1, "随访结果反馈不能为空"),
  followUpPerson: z.string().min(1, "回访人不能为空"),
  followUpDate: z.string().min(1, "回访日期不能为空"),
  followUpTime: z.string().min(1, "回访时间不能为空"),
  isReExamined: z.boolean().default(false),
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
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)

  const staffQuery = useMemoFirebase(() => collection(db, "staffProfiles"), [db])
  const { data: staff } = useCollection(staffQuery)
  const currentStaff = React.useMemo(() => staff?.find(s => s.email === user?.email), [staff, user])

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
    },
  })

  async function handleAction(shouldCloseCase: boolean) {
    if (!systemConfig?.mysql) return
    const isValid = await form.trigger()
    if (!isValid) return

    setIsSyncing(true)
    const values = form.getValues()
    const interactionId = `followup_${Date.now()}`
    
    // 我们需要知道 parent anomaly 的 checkupNumber 来同步 SP_SF
    // 这里可以通过 Firestore 或本地状态获取，或者直接在 MySQL Server Action 里 JOIN
    // 简化处理：目前我们在 SP_SF 中保存 archiveNo 即可，后续由 SQL 负责 JOIN

    const followUpData = {
      ...values,
      id: interactionId,
      patientProfileId: archiveNo,
      associatedAnomalyId: anomalyRecordId,
      archiveNo: archiveNo,
      isClosureRecord: shouldCloseCase,
      createdAt: new Date().toISOString()
    };

    try {
      // 同步到 MySQL SP_SF (增强版)
      await syncFollowUpToMysql(systemConfig.mysql, followUpData, 'SAVE')

      // 同步到 MySQL SP_YCJG 状态
      await syncAnomalyToMysql(systemConfig.mysql, {
        id: anomalyRecordId,
        isClosed: shouldCloseCase,
        lastFollowUpAt: new Date().toISOString()
      }, 'SAVE')

      toast({ title: "随访记录已同步至 MySQL" })
      onSuccess()
    } catch (err: any) {
      toast({ title: "同步失败", description: err.message, variant: "destructive" })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="size-4 text-primary" />
          <AlertTitle className="text-primary font-bold">临床随访登记</AlertTitle>
          <AlertDescription className="text-xs">正在为患者 [{archiveNo}] {patientName} 录入随访。</AlertDescription>
        </Alert>

        <Card className="shadow-md border-none ring-1 ring-border">
          <CardHeader className="bg-muted/30"><CardTitle className="text-lg">随访反馈内容</CardTitle></CardHeader>
          <CardContent className="pt-6 grid grid-cols-2 gap-6">
            <FormField control={form.control} name="followUpPerson" render={({ field }) => (
              <FormItem><FormLabel>随访人</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-2">
               <FormField control={form.control} name="followUpDate" render={({ field }) => (
                <FormItem><FormLabel>随访日期</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="followUpTime" render={({ field }) => (
                <FormItem><FormLabel>时间</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="col-span-full">
              <FormField control={form.control} name="followUpResult" render={({ field }) => (
                <FormItem><FormLabel>详细医学描述</FormLabel><FormControl><Textarea className="min-h-[120px]" {...field} /></FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="isReExamined" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                <FormLabel>是否已复查</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" size="lg" onClick={() => handleAction(false)} disabled={isSyncing}>仅保存</Button>
          <Button size="lg" onClick={() => handleAction(true)} disabled={isSyncing} className="px-12 gap-2 shadow-xl">
            {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-5" />}
            结案并同步 MySQL
          </Button>
        </div>
      </div>
    </Form>
  )
}
