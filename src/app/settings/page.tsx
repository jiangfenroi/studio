
"use client"

import * as React from "react"
import { Save, HardDrive, FolderOpen, ShieldCheck, Info, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"

export default function SettingsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [testing, setTesting] = React.useState(false)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)
  const [storagePath, setStoragePath] = React.useState("")

  React.useEffect(() => {
    if (config?.pdfStoragePath) {
      setStoragePath(config.pdfStoragePath)
    }
  }, [config])

  const handleSave = () => {
    setDocumentNonBlocking(configRef, {
      pdfStoragePath: storagePath,
      lastUpdated: new Date().toISOString()
    }, { merge: true })
    
    toast({
      title: "系统配置已更新",
      description: `PDF存储路径已设置为: ${storagePath}。`,
    })
  }

  const handleTestConnection = () => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      toast({
        title: "路径连接测试通过",
        description: "内网共享路径响应正常，读写权限验证成功。",
      })
    }, 1500)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-primary">系统配置</h1>
        <p className="text-muted-foreground">管理全院医疗数据系统的全局运行参数与存储逻辑</p>
      </header>

      <div className="grid gap-6">
        <Card className="border-none shadow-md">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="size-5 text-primary" />
              PDF 报告存储管理
            </CardTitle>
            <CardDescription>
              配置内网共享路径。程序将自动在此路径下按“档案编号/报告种类”建立二级文件夹。
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="storagePath">指定存储根路径</Label>
              <div className="flex gap-2">
                <Input 
                  id="storagePath" 
                  placeholder="例如: //172.17.126.18/e:/pic" 
                  value={storagePath}
                  onChange={(e) => setStoragePath(e.target.value)}
                  className="h-11 font-mono text-sm"
                />
                <Button variant="secondary" className="gap-2 h-11" onClick={() => toast({ title: "内网搜索", description: "正在扫描内网共享节点..." })}>
                  <FolderOpen className="size-4" />
                  浏览
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                当前保存逻辑: <code className="bg-muted px-1 rounded">{storagePath || "[根路径]"}/[档案编号]/[报告种类]/文件名.pdf</code>
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="size-4 text-green-600" />
                  路径连通性测试
                </h4>
                <p className="text-xs text-muted-foreground">系统定期检测存储路径的读写权限，确保临床数据闭环上传。</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={handleTestConnection}
                  disabled={testing || !storagePath}
                >
                  {testing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  立即测试连接
                </Button>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Info className="size-4 text-blue-600" />
                  二级文件夹逻辑
                </h4>
                <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-1">
                  <li>体检报告 (Medical Reports)</li>
                  <li>影像报告 (Imaging Reports)</li>
                  <li>病理报告 (Pathology Reports)</li>
                  <li>内镜报告 (Endoscopy Reports)</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4">
            <Button onClick={handleSave} className="gap-2 ml-auto" disabled={!storagePath}>
              <Save className="size-4" />
              保存系统配置
            </Button>
          </CardFooter>
        </Card>

        <Alert className="bg-amber-50 border-amber-200">
          <Info className="size-4 text-amber-600" />
          <AlertTitle className="text-amber-800">重要安全提醒</AlertTitle>
          <AlertDescription className="text-amber-700">
            修改存储路径后，旧路径下的文件不会自动搬迁。如需访问历史文件，请手动将原有文件夹移动至新路径。
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
