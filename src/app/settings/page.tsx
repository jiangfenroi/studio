
'use client';

import * as React from "react"
import { 
  Save, 
  ShieldCheck, 
  Loader2, 
  Monitor, 
  Database, 
  Users, 
  Plus,
  Trash2,
  Edit,
  Wrench,
  RotateCcw,
  Eraser,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  useUser,
  initiateSignOut,
  useAuth
} from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { syncStaffToMysql, syncConfigToMysql, clearAllStaffData } from "@/app/actions/mysql-sync"

// 默认内网数据库配置
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
  const [testing, setTesting] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<any | null>(null)
  const [userToDelete, setUserToDelete] = React.useState<any | null>(null)
  
  const [formData, setFormData] = React.useState({
    appName: "HealthInsight Registry",
    pdfStoragePath: "",
    pacsUrlBase: "http://172.16.201.61:7242/?ChtId=",
    mysqlHost: "8.137.162.142",
    mysqlPort: "3306",
    mysqlUser: "root",
    mysqlPassword: "",
    mysqlDatabase: "meditrack_db"
  })

  React.useEffect(() => {
    if (config) {
      setFormData({
        appName: config.appName || "HealthInsight Registry",
        pdfStoragePath: config.pdfStoragePath || "",
        pacsUrlBase: config.pacsUrlBase || "http://172.16.201.61:7242/?ChtId=",
        mysqlHost: config.mysql?.host || "8.137.162.142",
        mysqlPort: config.mysql?.port || "3306",
        mysqlUser: config.mysql?.user || "root",
        mysqlPassword: config.mysql?.password || "",
        mysqlDatabase: config.mysql?.database || "meditrack_db"
      })
    }
  }, [config])

  const handleSaveConfig = async () => {
    const mysqlConfig = {
      host: formData.mysqlHost,
      port: formData.mysqlPort,
      user: formData.mysqlUser,
      password: formData.mysqlPassword,
      database: formData.mysqlDatabase
    };
    
    setIsSyncing(true)
    try {
      await syncConfigToMysql(mysqlConfig, {
        appName: formData.appName,
        pacsUrlBase: formData.pacsUrlBase,
        pdfStoragePath: formData.pdfStoragePath
      });
      sessionStorage.setItem('mysql_config', JSON.stringify(mysqlConfig));
      toast({ title: "配置已保存", description: "系统参数已同步至本地 MySQL 库。" })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleClearAppCache = () => {
    sessionStorage.clear();
    localStorage.clear();
    toast({ title: "本地缓存已清除", description: "系统配置已重置为代码默认值。" });
    window.location.reload();
  }

  const handleResetStaffDB = async () => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('mysql_config') : null;
    const mysqlConfig = stored ? JSON.parse(stored) : DEFAULT_MYSQL;
    
    setIsSyncing(true)
    try {
      await clearAllStaffData(mysqlConfig);
      toast({ title: "员工库已清空", description: "所有注册信息已从 MySQL 中移除。" });
      if (auth) {
        initiateSignOut(auth);
        router.push("/login");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "操作失败", description: err.message });
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">系统中心配置</h1>
          <p className="text-muted-foreground font-medium">MySQL 核心驱动 • 禁止任何云端临床同步</p>
        </div>
        <Button onClick={handleSaveConfig} className="gap-2 shadow-lg" disabled={isSyncing}>
          {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存全局配置
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 mb-8 bg-muted/50">
          <TabsTrigger value="general" className="gap-2 text-base"><Monitor className="size-4" /> 基础与集成</TabsTrigger>
          <TabsTrigger value="mysql" className="gap-2 text-base"><Database className="size-4" /> MySQL 连接</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 text-base"><Users className="size-4" /> 账户列表</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2 text-base text-destructive"><Wrench className="size-4" /> 系统维护</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle>基础信息集成</CardTitle>
              <CardDescription>配置内网 PACS 基准地址及共享存储路径。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>系统显示名称</Label>
                  <Input value={formData.appName} onChange={e => setFormData({...formData, appName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>PACS 基准地址</Label>
                  <Input value={formData.pacsUrlBase} onChange={e => setFormData({...formData, pacsUrlBase: e.target.value})} className="font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>PDF 报告共享路径</Label>
                <Input value={formData.pdfStoragePath} onChange={e => setFormData({...formData, pdfStoragePath: e.target.value})} className="font-mono text-xs" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mysql" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2"><Database className="size-5 text-primary" /> MySQL 8.4 通讯配置</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2"><Label>主机地址</Label><Input value={formData.mysqlHost} onChange={e => setFormData({...formData, mysqlHost: e.target.value})} /></div>
              <div className="space-y-2"><Label>端口</Label><Input value={formData.mysqlPort} onChange={e => setFormData({...formData, mysqlPort: e.target.value})} /></div>
              <div className="space-y-2"><Label>数据库</Label><Input value={formData.mysqlDatabase} onChange={e => setFormData({...formData, mysqlDatabase: e.target.value})} /></div>
              <div className="space-y-2"><Label>用户</Label><Input value={formData.mysqlUser} onChange={e => setFormData({...formData, mysqlUser: e.target.value})} /></div>
              <div className="space-y-2"><Label>密码</Label><Input type="password" value={formData.mysqlPassword} onChange={e => setFormData({...formData, mysqlPassword: e.target.value})} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle>员工账户中心</CardTitle>
              <CardDescription>同步自 MySQL 的所有在职人员信息。</CardDescription>
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

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><RotateCcw className="size-5 text-amber-600" /> 重置本地缓存</CardTitle>
                <CardDescription>清除浏览器暂存的数据库连接信息，将所有配置恢复至代码预设值。</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleClearAppCache}>
                  <Eraser className="size-4 mr-2" /> 立即清理缓存
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="size-5" /> 初始化员工库</CardTitle>
                <CardDescription>危险操作！将物理清空 MySQL 中的 SP_STAFF 表。清空后所有工号需重新注册。</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full shadow-lg">清空所有员工记录</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确定要执行初始化吗？</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作将清空您的 MySQL 员工档案表。系统将自动退出，您需要重新注册管理员账号。临床异常数据（SP_YCJG）将保留，不受影响。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetStaffDB} className="bg-destructive">确认重置</AlertDialogAction>
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
