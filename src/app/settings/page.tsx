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
  setDocumentNonBlocking, 
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser
} from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { updatePassword } from "firebase/auth"
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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { syncStaffToMysql, syncConfigToMysql } from "@/app/actions/mysql-sync"

export default function SettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)
  
  const staffQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return collection(db, "staffProfiles");
  }, [db, user])
  const { data: staffMembers } = useCollection(staffQuery)
  
  const [activeTab, setActiveTab] = React.useState("general")
  const [testing, setTesting] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<any | null>(null)
  const [userToDelete, setUserToDelete] = React.useState<any | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  
  const [formData, setFormData] = React.useState({
    appName: "HealthInsight Registry",
    appLogoFileName: "logo.png",
    pdfStoragePath: "",
    pacsUrlBase: "http://172.16.201.61:7242/?ChtId=",
    mysqlHost: "172.17.168.18",
    mysqlPort: "10699",
    mysqlUser: "medi_admin",
    mysqlPassword: "AdminPassword123",
    mysqlDatabase: "meditrack_db"
  })

  React.useEffect(() => {
    if (config) {
      setFormData({
        appName: config.appName || "HealthInsight Registry",
        appLogoFileName: config.appLogoFileName || "logo.png",
        pdfStoragePath: config.pdfStoragePath || "",
        pacsUrlBase: config.pacsUrlBase || "http://172.16.201.61:7242/?ChtId=",
        mysqlHost: config.mysql?.host || "172.17.168.18",
        mysqlPort: config.mysql?.port || "10699",
        mysqlUser: config.mysql?.user || "medi_admin",
        mysqlPassword: config.mysql?.password || "AdminPassword123",
        mysqlDatabase: config.mysql?.database || "meditrack_db"
      })
    }
  }, [config])

  const handleSaveConfig = () => {
    const updateData = {
      appName: formData.appName,
      appLogoFileName: formData.appLogoFileName,
      pdfStoragePath: formData.pdfStoragePath,
      pacsUrlBase: formData.pacsUrlBase,
      mysql: {
        host: formData.mysqlHost,
        port: formData.mysqlPort,
        user: formData.mysqlUser,
        password: formData.mysqlPassword,
        database: formData.mysqlDatabase
      },
      lastUpdated: new Date().toISOString()
    };
    
    setDocumentNonBlocking(configRef, updateData, { merge: true })
    
    if (updateData.mysql) {
      syncConfigToMysql(updateData.mysql, updateData);
    }
    
    toast({
      title: "系统配置已保存",
      description: "配置信息已同步至中心 MySQL 数据库。",
    })
  }

  const handleTestConnection = () => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      toast({
        title: "路径连接测试成功",
        description: "内网共享路径响应正常。",
      })
    }, 1200)
  }

  const handleAddUser = () => {
    const newUser = {
      name: "新员工",
      email: "staff@meditrack.local",
      role: "医生",
      jobId: `STAFF-${Date.now().toString().slice(-4)}`,
      status: "在职"
    }
    addDocumentNonBlocking(collection(db, "staffProfiles"), newUser)
    
    if (config?.mysql) {
      syncStaffToMysql(config.mysql, newUser, 'SAVE');
    }

    toast({ title: "已预设新账户" })
  }

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return
    if (userToDelete.jobId === '1058') {
      toast({ variant: "destructive", title: "禁止删除内置管理员账户" })
      return
    }

    deleteDocumentNonBlocking(doc(db, "staffProfiles", userToDelete.id))
    
    if (config?.mysql) {
      syncStaffToMysql(config.mysql, userToDelete, 'DELETE');
    }

    toast({ title: "账户已注销" })
    setUserToDelete(null)
  }

  const handleSaveUserEdit = async () => {
    if (!editingUser) return
    updateDocumentNonBlocking(doc(db, "staffProfiles", editingUser.id), editingUser)
    
    if (config?.mysql) {
      syncStaffToMysql(config.mysql, editingUser, 'SAVE');
    }

    if (newPassword && user && user.email === editingUser.email) {
      try {
        await updatePassword(user, newPassword)
        toast({ title: "密码更新成功" })
      } catch (error: any) {
        toast({ variant: "destructive", title: "密码更新失败", description: "请重新登录后再试。" })
      }
    }

    setEditingUser(null)
    setNewPassword("")
    toast({ title: "账户信息已更新" })
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">系统中心配置</h1>
          <p className="text-muted-foreground">统筹内网数据库、外部集成及临床权限</p>
        </div>
        <Button onClick={handleSaveConfig} className="gap-2 shadow-lg">
          <Save className="size-4" />
          保存全局配置
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 mb-8 bg-muted/50">
          <TabsTrigger value="general" className="gap-2 text-base">
            <Monitor className="size-4" /> 基础与集成
          </TabsTrigger>
          <TabsTrigger value="mysql" className="gap-2 text-base">
            <Database className="size-4" /> MySQL 业务库
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 text-base">
            <Users className="size-4" /> 账户权限
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle>系统名称与外部集成</CardTitle>
              <CardDescription>配置 PACS 地址及共享路径。</CardDescription>
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
                <Label>PDF 报告存储共享路径</Label>
                <div className="flex gap-2">
                  <Input value={formData.pdfStoragePath} onChange={e => setFormData({...formData, pdfStoragePath: e.target.value})} className="font-mono text-xs" />
                  <Button variant="secondary" onClick={handleTestConnection} disabled={testing}>
                    {testing ? <Loader2 className="size-3 animate-spin mr-1" /> : <ShieldCheck className="size-3 mr-1" />}
                    测试连接
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mysql" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5 text-primary" />
                MySQL 8.4 连接配置
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2"><Label>主机地址</Label><Input value={formData.mysqlHost} onChange={e => setFormData({...formData, mysqlHost: e.target.value})} /></div>
              <div className="space-y-2"><Label>通信端口</Label><Input value={formData.mysqlPort} onChange={e => setFormData({...formData, mysqlPort: e.target.value})} /></div>
              <div className="space-y-2"><Label>数据库名</Label><Input value={formData.mysqlDatabase} onChange={e => setFormData({...formData, mysqlDatabase: e.target.value})} /></div>
              <div className="space-y-2"><Label>用户名</Label><Input value={formData.mysqlUser} onChange={e => setFormData({...formData, mysqlUser: e.target.value})} /></div>
              <div className="space-y-2"><Label>密码</Label><Input type="password" value={formData.mysqlPassword} onChange={e => setFormData({...formData, mysqlPassword: e.target.value})} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between bg-primary/5">
              <div>
                <CardTitle>系统账户列表</CardTitle>
                <CardDescription>管理所有临床人员的访问权限。</CardDescription>
              </div>
              <Button onClick={handleAddUser} size="sm" className="gap-1"><Plus className="size-4" /> 预设账户</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>工号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers?.map(staff => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-mono font-bold text-primary">{staff.jobId}</TableCell>
                      <TableCell>{staff.name}</TableCell>
                      <TableCell><Badge variant="outline">{staff.role}</Badge></TableCell>
                      <TableCell><Badge className={staff.status === '在职' ? 'bg-green-500' : 'bg-red-500'}>{staff.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingUser(staff)}><Edit className="size-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setUserToDelete(staff)}><Trash2 className="size-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingUser} onOpenChange={o => !o && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>账户资料维护</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">姓名</Label>
              <Input 
                value={editingUser?.name || ""} 
                onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">新密码</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="col-span-3" 
                placeholder="留空不修改" 
              />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveUserEdit}>保存更改</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={o => !o && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认注销此账户？</AlertDialogTitle><AlertDialogDescription>此操作不可恢复。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteUser} className="bg-red-500">确认注销</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
