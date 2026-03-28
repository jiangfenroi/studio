"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { FollowUpForm } from "@/components/forms/FollowUpForm"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { fetchAnomalyDetails } from "@/app/actions/mysql-sync"

export default function FollowUpRecordPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const id = params.id as string
  const [anomalyData, setAnomalyData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (!config.host) throw new Error('数据库未配置')
      
      const details = await fetchAnomalyDetails(config, id)
      if (!details) {
        throw new Error('未找到该异常记录的详情')
      }
      setAnomalyData(details)
    } catch (err: any) {
      toast({ variant: "destructive", title: "数据检索失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleSuccess = () => {
    toast({
      title: "记录保存成功",
      description: "随访信息已同步至中心 MySQL。",
    })
    router.push("/follow-ups")
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-primary size-6" />
        <p className="text-muted-foreground">正在检索临床档案...</p>
      </div>
    )
  }

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
        archiveNo={anomalyData?.archiveNo || ""} 
        patientName={anomalyData?.patientName || "未知患者"} 
        anomalyRecordId={id}
        onSuccess={handleSuccess} 
      />
    </div>
  )
}