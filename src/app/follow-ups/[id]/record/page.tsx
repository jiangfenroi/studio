
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { FollowUpForm } from "@/components/forms/FollowUpForm"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

export default function FollowUpRecordPage() {
  const params = useParams()
  const router = useRouter()
  const db = useFirestore()
  const { toast } = useToast()
  
  const id = params.id as string
  
  // Try to find the anomaly record to get patient info
  // In our system, records are under patientProfiles/{pid}/medicalAnomalyRecords/{id}
  // But the [id] here is the anomalyRecordId. We might need a patientId too.
  // For the sake of this synthesis, we'll assume the URL id is unique enough or we use a collectionGroup
  // However, the [id]/record path implies we know the specific record.
  
  // Re-fetching patient info if needed, or relying on props if this was a modal
  // Given current structure, we need the archiveNo to update the document correctly.
  
  const handleSuccess = () => {
    toast({
      title: "记录保存成功",
      description: "随访信息已同步。",
    })
    router.push("/follow-ups")
  }

  // Find archiveNo from ID (this is a simplification, ideally it's in the URL or state)
  // Let's assume the ID starts with ArchiveNo (e.g., D12345_202501010001)
  const archiveNo = id.split('_')[0]

  return (
    <div className="container mx-auto py-10 px-6 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">录入随访记录</h1>
          <p className="text-muted-foreground">记录进一步的诊断建议、治疗反馈及结案确认</p>
        </div>
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          返回列表
        </Button>
      </div>

      <FollowUpForm 
        archiveNo={archiveNo} 
        patientName="患者" 
        anomalyRecordId={id}
        onSuccess={handleSuccess} 
      />
    </div>
  )
}
