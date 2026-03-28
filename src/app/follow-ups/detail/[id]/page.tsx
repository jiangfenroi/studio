"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { FollowUpForm } from "@/components/forms/FollowUpForm"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Eye } from "lucide-react"
import { fetchFollowUpDetail } from "@/app/actions/mysql-sync"

export default function FollowUpReadOnlyPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const id = params.id as string
  const [followUpData, setFollowUpData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (!config.host) throw new Error('数据库未配置')
      
      const details = await fetchFollowUpDetail(config, id)
      if (!details) {
        throw new Error('未找到该随访记录的详情')
      }
      setFollowUpData(details)
    } catch (err: any) {
      toast({ variant: "destructive", title: "数据检索失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [id, toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-primary size-6" />
        <p className="text-muted-foreground">正在检索随访档案...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-6 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Eye className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">临床随访结果详情 (只读)</h1>
            <p className="text-muted-foreground font-medium">中心 MySQL 驱动：临床路径全闭环监控</p>
          </div>
        </div>
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          返回列表
        </Button>
      </div>

      <FollowUpForm 
        archiveNo={followUpData?.archiveNo || ""} 
        patientName={followUpData?.patientName || "未知患者"} 
        anomalyRecordId={followUpData?.associatedAnomalyId || ""}
        initialData={followUpData}
        readOnly={true}
        onSuccess={() => {}} 
      />
    </div>
  )
}
