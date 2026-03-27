
'use client';

import * as React from "react"
import { 
  Save, 
  ShieldCheck, 
  Loader2, 
  Monitor, 
  Database, 
  Users, 
  Wrench,
  RotateCcw,
  Eraser,
  AlertTriangle,
  FolderOpen,
  Globe
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser, initiateSignOut, useAuth } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { syncConfigToMysql, clearAllStaffData, clearAllClinicalData } from "@/app/actions/mysql-sync"

const DEFAULT_MYSQL = {
  host: '8.137.162.142',
  port: '3306',
  user: 'root',
  password: '',
  database: 'meditrack_db'
};

export default function SettingsPage() {
  const db = useFirestore()
  const auth = useAuth()
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  
  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)
  
  const staffQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return collection(db, "staffProfiles");
  }, [db, user])
  const { data: staffMembers } = useCollection(staffQuery)
  
  const [activeTab, setActiveTab] = React.useState("general")
  const [isSyncing, setIsSyncing] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    appName: "HealthInsight Registry",
    pdfStoragePath: "C:\\HealthReports\\",
    pacsUrlBase: "http://172.16.201.61:7242/?ChtId=",
    mysqlHost: "8.137.162.142",
    mysqlPort: "3306",
    mysqlUser: "root",
    mysqlPassword: "",
    mysqlDatabase: "meditrack_db"
  })

  React.useEffect(() => {
    const stored = sessionStorage.getItem('mysql_config')
    if (stored) {
      const c = JSON.parse(stored)
      setFormData(prev => ({ ...prev, mysqlHost: c.host, mysqlPort: c.port, mysqlUser: c.user, mysqlDatabase: c.database }))
    }
  }, [])

  const handleSaveConfig = async () => {
    const mysqlConfig = { host: formData.mysqlHost, port: formData.mysqlPort, user: formData.mysqlUser, password: formData.mysqlPassword, database: formData.mysqlDatabase };
    setIsSyncing(true)
    try {
      await syncConfigToMysql(mysqlConfig, { appName: formData.appName, pacsUrlBase: formData.pacsUrlBase, pdfStoragePath: formData.pdfStoragePath });
      sessionStorage.setItem('mysql_config', JSON.stringify(mysqlConfig));
      toast({ title: "全局配置已保存", description: "MySQL 核心表 SP_CONFIG 已同步。" })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleClearAppCache = () => {
    sessionStorage.clear(); localStorage.clear();
    toast({ title: "本地缓存已清除", description: "浏览器配置状态已重置。" });
    window.location.reload();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">系统中心配置</h1>
          <p className="text-muted-foreground font-medium">MySQL 核心驱动 • PDF 集中化报告管理中心</p>
        </div>
        <Button onClick={handleSaveConfig} className="gap-2 shadow-lg" disabled={isSyncing}>
          {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          同步至中心数据库
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 mb-8 bg-muted/50">
          <TabsTrigger value="general" className="gap-2 text-base"><Monitor className="size-4" /> 集成路径</TabsTrigger>
          <TabsTrigger value="mysql" className="gap-2 text-base"><Database className="size-4" /> MySQL 连接</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 text-base"><Users className="size-4" /> 账户权限</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2 text-base text-destructive"><Wrench className="size-4" /> 系统维护</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2"><FolderOpen className="size-5 text-primary" /> 共享存储与集成</CardTitle>
              <CardDescription>配置内网报告存储全路径及 PACS 检索逻辑。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>系统显示名称</Label>
                  <Input value={formData.appName} onChange={e => setFormData({...formData, appName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Globe className="size-3" /> PACS 基准地址</Label>
                  <Input value={formData.pacsUrlBase} onChange={e => setFormData({...formData, pacsUrlBase: e.target.value})} className="font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><FolderOpen className="size-3" /> PDF 报告归档根路径 (内网共享)</Label>
                <Input value={formData.pdfStoragePath} onChange={e => setFormData({...formData, pdfStoragePath: e.target.value})} className="font-mono text-xs" placeholder="例如: \\172.17.126.18\pic" />
                <p className="text-[10px] text-muted-foreground">提示：系统上传时会自动追加 "档案编号\类别\文件名" 子路径。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mysql" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2"><Database className="size-5 text-primary" /> MySQL 8.4 核心连接</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2"><Label>主机地址</Label><Input value={formData.mysqlHost} onChange={e => setFormData({...formData, mysqlHost: e.target.value})} /></div>
              <div className="space-y-2"><Label>端口</Label><Input value={formData.mysqlPort} onChange={e => setFormData({...formData, mysqlPort: e.target.value})} /></div>
              <div className="space-y-2"><Label>数据库名</Label><Input value={formData.mysqlDatabase} onChange={e => setFormData({...formData, mysqlDatabase: e.target.value})} /></div>
              <div className="space-y-2"><Label>用户</Label><Input value={formData.mysqlUser} onChange={e => setFormData({...formData, mysqlUser: e.target.value})} /></div>
              <div className="space-y-2"><Label>密码</Label><Input type="password" value={formData.mysqlPassword} onChange={e => setFormData({...formData, mysqlPassword: e.target.value})} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle>员工账户中心</CardTitle>
              <CardDescription>同步自 MySQL 的在职人员信息。</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>工号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers?.map(staff => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-mono font-bold text-primary">{staff.jobId}</TableCell>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell><Badge variant="outline">{staff.role}</Badge></TableCell>
                    <TableCell><Badge className={staff.status === '在职' ? 'bg-green-500' : 'bg-red-500'}>{staff.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><RotateCcw className="size-5 text-amber-600" /> 重置终端缓存</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleClearAppCache}>
                  <Eraser className="size-4 mr-2" /> 立即清理缓存
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="size-5" /> 初始化临床库</CardTitle>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full shadow-lg">清空全量业务数据</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认清空吗？</AlertDialogTitle>
                      <AlertDialogDescription>SP_PERSON, SP_YCJG, SP_SF, SP_PDF 及其关联文件索引将被物理删除。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => clearAllClinicalData(JSON.parse(sessionStorage.getItem('mysql_config') || '{}')).then(() => toast({ title: "已清空" }))} className="bg-destructive">确认</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
