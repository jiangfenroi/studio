
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { User, ArrowRight, SkipForward, Phone, CreditCard } from "lucide-react"
import { useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
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
  const db = useFirestore()
  const { toast } = useToast()
  
  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)

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

  function onSubmit(values: z.infer<typeof patientSchema>) {
    const patientRef = doc(db, "patientProfiles", archiveNo)
    setDocumentNonBlocking(patientRef, values, { merge: true })
    
    // 同步到 MySQL SP_PERSON
    if (systemConfig?.mysql) {
      syncPatientToMysql(systemConfig.mysql, values, 'SAVE');
    }

    toast({
      title: "档案已补充",
      description: `患者 ${values.name} 的基本信息已成功同步。`,
    })
    
    onComplete()
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-2xl border-none ring-1 ring-primary/20">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-xl py-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <User className="size-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl">补充个人健康档案</CardTitle>
                  <CardDescription className="text-primary-foreground/80 font-medium">
                    正在为档案编号 <span className="underline decoration-white/40">{archiveNo}</span> 完善人口学信息
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 px-10">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary font-bold">姓名</FormLabel>
                    <FormControl><Input placeholder="姓名" {...field} className="h-12 text-lg border-primary/20 focus:border-primary" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary font-bold">性别</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 text-lg border-primary/20"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="男">男</SelectItem>
                        <SelectItem value="女">女</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary font-bold">年龄</FormLabel>
                    <FormControl><Input type="number" {...field} className="h-12 text-lg border-primary/20" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary font-bold flex items-center gap-2">
                      <Phone className="size-4" /> 联系电话
                    </FormLabel>
                    <FormControl><Input placeholder="11位手机号或座机" {...field} className="h-12 text-lg border-primary/20" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-full">
                <FormField
                  control={form.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-bold flex items-center gap-2">
                        <CreditCard className="size-4" /> 身份证号
                      </FormLabel>
                      <FormControl><Input placeholder="18位身份证号码" {...field} className="h-12 text-lg font-mono border-primary/20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <div className="flex justify-between items-center px-10 pb-10 mt-6">
              <Button type="button" variant="ghost" onClick={onSkip} className="gap-2 text-muted-foreground hover:text-primary transition-colors">
                <SkipForward className="size-4" />
                跳过补充，直接进入结果列表
              </Button>
              <Button type="submit" size="lg" className="px-16 gap-3 text-lg shadow-lg hover:scale-[1.02] transition-transform">
                保存并同步
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </Card>
        </form>
      </Form>
    </div>
  )
}
