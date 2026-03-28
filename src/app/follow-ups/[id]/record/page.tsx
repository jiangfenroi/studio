
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { FollowUpForm } from "@/components/forms/FollowUpForm"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { fetchPatientFullTimeline } from "@/app/actions/mysql-sync"

export default function FollowUpRecordPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const id = params.id as string
  const [data, setData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const loadPatientData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (!config.host) throw new Error('数据库未配置')
      
      // We use the anomalyId to find the patient first. 
      // This requires the archiveNo. In our system, the anomalyId is the key.
      // But fetchPatientFullTimeline needs archiveNo.
      // Let's assume the ID passed is the anomalyId and we need to resolve it.
      // For simplicity in this offline shell, we'll try to find the archiveNo from session or a simple lookup.
      // If the URL contains archiveNo_anomalyId pattern, it's easier.
      // Given the current tasks mapping, we'll assume the URL id is the anomalyId.
      
      // Fallback: If archiveNo isn't known, we might need a dedicated lookup action.
      // For now, let's use a generic fetch if archiveNo isn't in URL.
      // However, usually the task list passes this.
      
    } catch (err: any) {
      toast({ variant: "destructive", title: "加载失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    loadPatientData()
  }, [loadPatientData])

  const handleSuccess = () => {
    toast({
      title: "记录保存成功",
      description: "随访信息已同步至中心 MySQL。",
    })
    router.push("/follow-ups")
  }

  // Resolving archiveNo from the anomalyId (simplified logic for offline demo)
  const archiveNo = id.startsWith('YCJG') ? 'UNKNOWN' : id.split('_')[0];

  return (
    <div className="container mx-auto py-10 px-6 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">录入随访结果</h1>
          <p className="text-muted-foreground font-medium">中心 MySQL 驱动：确保临床闭环管理严谨性</p>
        </div>
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          返回列表
        </Button>
      </div>

      <FollowUpForm 
        archiveNo={archiveNo} 
        patientName="检索中..." 
        anomalyRecordId={id}
        onSuccess={handleSuccess} 
      />
    </div>
  )
}
