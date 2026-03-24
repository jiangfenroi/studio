
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { User, ArrowRight, SkipForward } from "lucide-react"

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
  archiveNo: z.string(),
  name: z.string().min(1, "姓名不能为空"),
  gender: z.enum(["男", "女", "其他"]),
  age: z.coerce.number().min(0).max(150),
  phone: z.string().min(1, "电话不能为空"),
})

interface PatientInfoFormProps {
  archiveNo: string
  onComplete: () => void
  onSkip: () => void
}

export function PatientInfoForm({ archiveNo, onComplete, onSkip }: PatientInfoFormProps) {
  const form = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      archiveNo: archiveNo,
      name: "",
      gender: "男",
      age: 0,
      phone: "",
    },
  })

  function onSubmit(values: z.infer<typeof patientSchema>) {
    console.log("Saving patient info:", values)
    onComplete()
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-xl border-primary/20">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
              <CardTitle className="text-2xl flex items-center gap-2">
                <User className="size-6" />
                个人档案信息补充
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                档案编号：{archiveNo}。补充完善患者基本资料以便于后续随访。
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 px-10">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="患者姓名" {...field} className="text-lg h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>性别</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-lg h-12">
                          <SelectValue placeholder="选择性别" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormLabel>年龄</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="text-lg h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系电话</FormLabel>
                    <FormControl>
                      <Input placeholder="手机号或座机号" {...field} className="text-lg h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <div className="flex justify-between items-center px-10 pb-10 pt-4">
              <Button type="button" variant="ghost" onClick={onSkip} className="gap-2 text-muted-foreground">
                <SkipForward className="size-4" />
                跳过，稍后补录
              </Button>
              <Button type="submit" size="lg" className="px-12 gap-2 text-lg">
                完成并保存
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </Card>
        </form>
      </Form>
    </div>
  )
}
