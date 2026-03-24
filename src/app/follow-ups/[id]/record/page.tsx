
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { FollowUpForm } from "@/components/forms/FollowUpForm"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function FollowUpRecordPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  // In a real app, we would fetch the task details by ID
  // For demo, we use mock mapping
  const mockInfo = {
    '1': { archiveNo: 'D1001', name: '张三' },
    '2': { archiveNo: 'D1002', name: '李四' },
  }
  
  const id = params.id as string
  const task = mockInfo[id as keyof typeof mockInfo] || { archiveNo: '未知', name: '未知' }

  const handleSuccess = () => {
    toast({
      title: "随访记录保存成功",
      description: "该任务已转入已结案列表。",
    })
    router.push("/follow-ups")
  }

  return (
    <div className="container mx-auto py-10 px-6 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">录入重要异常结果随访记录</h1>
          <p className="text-muted-foreground">请根据回访实际情况填写相关信息，并上传检查报告</p>
        </div>
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          返回列表
        </Button>
      </div>

      <FollowUpForm 
        archiveNo={task.archiveNo} 
        patientName={task.name} 
        onSuccess={handleSuccess} 
      />
    </div>
  )
}
