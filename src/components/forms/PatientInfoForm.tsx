
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { User, ArrowRight, SkipForward, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { syncPatientToMysql } from "@/app/actions/mysql-sync"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const patientSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "姓名不能为空"),
  gender: z.enum(["男", "女", "其他"]),
  age: z.coerce.number().min(0).max(150),
  phoneNumber: z.string().min(1, "联系电话不能为空"),
  idNumber: z.string().min(1, "身份证号不能为空"),
  status: z.enum(["正常", "死亡", "无法联系"]).default("正常"),
  organization: z.string().optional(),
  address: z.string().optional(),
})

interface PatientInfoFormProps {
  archiveNo: string
  onComplete: () => void
  onSkip: () => void
}

export function PatientInfoForm({ archiveNo, onComplete, onSkip }: PatientInfoFormProps) {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)

  const form = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      id: archiveNo,
      name: "",
      gender: "男",
      age: 0,
      phoneNumber: "",
      idNumber: "",
      status: "正常",
      organization: "",
      address: "",
    },
  })

  async function onSubmit(values: z.infer<typeof patientSchema>) {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    setIsSyncing(true)
    try {
      await syncPatientToMysql(config, values);
      toast({ title: "档案已完善", description: "信息已成功同步至中心 MySQL 数据库。" });
      onComplete()
    } catch (err: any) {
      toast({ variant: "destructive", title: "同步失败", description: err.message });
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-2xl border-none ring-1 ring-primary/20 overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground py-8">
            <div className="flex items-center gap-4">
              <User className="size-8" />
              <div>
                <CardTitle>补录个人健康档案 (Step 2)</CardTitle>
                <CardDescription className="text-primary-foreground/80">档案编号: {archiveNo}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-10 grid grid-cols-1 md:grid-cols-2 gap-8 px-10">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>姓名</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem>
                <FormLabel>性别</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="男">男</SelectItem><SelectItem value="女">女</SelectItem><SelectItem value="其他">其他</SelectItem></SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="age" render={({ field }) => (
              <FormItem><FormLabel>年龄</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="idNumber" render={({ field }) => (
              <FormItem className="col-span-full"><FormLabel>身份证号 (18位)</FormLabel><FormControl><Input maxLength={18} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
              <FormItem><FormLabel>电话</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="organization" render={({ field }) => (
              <FormItem><FormLabel>工作单位</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>状态</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="正常">正常</SelectItem><SelectItem value="死亡">死亡</SelectItem><SelectItem value="无法联系">无法联系</SelectItem></SelectContent>
                </Select>
              </FormItem>
            )} />
          </CardContent>
          <div className="flex justify-between items-center px-10 pb-10">
            <Button type="button" variant="ghost" onClick={onSkip} disabled={isSyncing}><SkipForward className="size-4 mr-2" /> 稍后补录 (跳过)</Button>
            <Button type="submit" size="lg" disabled={isSyncing} className="gap-2">
              {isSyncing ? <Loader2 className="animate-spin" /> : <ArrowRight />} 保存档案
            </Button>
          </div>
        </Card>
      </form>
    </Form>
  )
}
