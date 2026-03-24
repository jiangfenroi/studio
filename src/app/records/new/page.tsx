
"use client"

import * as React from "react"
import { AbnormalResultForm } from "@/components/forms/AbnormalResultForm"
import { PatientInfoForm } from "@/components/forms/PatientInfoForm"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function NewRecordPage() {
  const [step, setStep] = React.useState<1 | 2>(1)
  const [currentArchiveNo, setCurrentArchiveNo] = React.useState("")
  const { toast } = useToast()
  const router = useRouter()

  const handleFirstStepSuccess = (archiveNo: string) => {
    setCurrentArchiveNo(archiveNo)
    setStep(2)
    toast({
      title: "第一步保存成功",
      description: "已登记异常结果，请补充个人信息。",
    })
  }

  const handleFinalSuccess = () => {
    toast({
      title: "登记完成",
      description: "所有信息已成功保存至内网数据库。",
    })
    router.push("/records")
  }

  const handleSkip = () => {
    toast({
      title: "登记已完成",
      description: "个人信息可稍后在档案管理中补录。",
    })
    router.push("/records")
  }

  return (
    <div className="container mx-auto py-10 px-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">体检重要异常结果登记</h1>
        <div className="flex items-center gap-4 mt-4">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`flex items-center justify-center size-8 rounded-full border-2 ${step === 1 ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>1</span>
            <span className="font-medium">异常结果登记</span>
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`flex items-center justify-center size-8 rounded-full border-2 ${step === 2 ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>2</span>
            <span className="font-medium">个人信息补充</span>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <AbnormalResultForm onSuccess={handleFirstStepSuccess} />
      ) : (
        <PatientInfoForm 
          archiveNo={currentArchiveNo} 
          onComplete={handleFinalSuccess} 
          onSkip={handleSkip} 
        />
      )}
    </div>
  )
}
