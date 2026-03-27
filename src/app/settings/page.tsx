
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
  Globe,
  Trash2,
  Edit,
  Plus
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { syncConfigToMysql, clearAllStaffData, clearAllClinicalData, fetchAllStaff, updateStaff, deleteStaff } from "@/app/actions/mysql-sync"

export default function SettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = React.useState("general")
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [staffList, setStaffList] = React.useState<any[]>([])
  const [editingStaff, setEditingStaff] = React.useState<any>(null)
  
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

  const loadStaff = React.useCallback(async () => {
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      const data = await fetchAllStaff(config)
      setStaffList(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  React.useEffect(() => {
    const stored = sessionStorage.getItem('mysql_config')
    if (stored) {
      const c = JSON.parse(stored)
      setFormData(prev => ({ ...prev, mysqlHost: c.host, mysqlPort: c.port, mysqlUser: c.user, mysqlDatabase: c.database }))
    }
    loadStaff()
  }, [loadStaff])

  const handleSaveConfig = async () => {
    const mysqlConfig = { host: formData.mysqlHost, port: formData.mysqlPort, user: formData.mysqlUser, password: formData.mysqlPassword, database: formData.mysqlDatabase };
    setIsSyncing(true)
    try {
      await syncConfigToMysql(mysqlConfig, { appName: formData.appName, pacsUrlBase: formData.pacsUrlBase, pdfStoragePath: formData.pdfStoragePath });
      sessionStorage.setItem('mysql_config', JSON.stringify(mysqlConfig));
      toast({ title: "配置同步成功", description: "中心 MySQL 库配置已更新。" })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff) return
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    try {
      await updateStaff(config, editingStaff)
      toast({ title: "员工信息已更新" })
      setEditingStaff(null)
      loadStaff()
    } catch (e: any) {
      toast({ variant: "destructive", title: "更新失败", description: e.message })
    }
  }

  const handleDeleteStaff = async (jobId: string) => {
    const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
    try {
      await deleteStaff(config, jobId)
      toast({ title: "已移除该员工账号" })
      loadStaff()
    } catch (e: any) {
      toast({ variant: "destructive", title: "删除失败", description: e.message })
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">管理配置中心</h1>
          <p className="text-muted-foreground font-medium">权限：管理员终端 • 数据中心化交互模式</p>
        </div>
        <Button onClick={handleSaveConfig} className="gap-2 shadow-lg" disabled={isSyncing}>
          {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          同步全局配置
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 mb-8 bg-muted/50 p-1">
          <TabsTrigger value="general" className="gap-2 text-base"><Monitor className="size-4" /> 集成路径</TabsTrigger>
          <TabsTrigger value="mysql" className="gap-2 text-base"><Database className="size-4" /> 数据库链路</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 text-base"><Users className="size-4" /> 账户权限</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2 text-base text-destructive"><Wrench className="size-4" /> 系统维护</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2"><FolderOpen className="size-5 text-primary" /> 临床业务集成</CardTitle>
              <CardDescription>配置 PACS 地址及内网 PDF 共享归档根目录。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>系统显示名称</Label>
                  <Input value={formData.appName} onChange={e => setFormData({...formData, appName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Globe className="size-3" /> PACS 基准链接</Label>
                  <Input value={formData.pacsUrlBase} onChange={e => setFormData({...formData, pacsUrlBase: e.target.value})} className="font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>PDF 报告归档根路径 (内网共享模式)</Label>
                <Input value={formData.pdfStoragePath} onChange={e => setFormData({...formData, pdfStoragePath: e.target.value})} className="font-mono text-xs" placeholder="\\172.17.126.18\reports" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mysql" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2"><Database className="size-5 text-primary" /> MySQL 8.4 通讯链路</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2"><Label>主机地址</Label><Input value={formData.mysqlHost} onChange={e => setFormData({...formData, mysqlHost: e.target.value})} /></div>
              <div className="space-y-2"><Label>端口</Label><Input value={formData.mysqlPort} onChange={e => setFormData({...formData, mysqlPort: e.target.value})} /></div>
              <div className="space-y-2"><Label>数据库名</Label><Input value={formData.mysqlDatabase} onChange={e => setFormData({...formData, mysqlDatabase: e.target.value})} /></div>
              <div className="space-y-2"><Label>用户名</Label><Input value={formData.mysqlUser} onChange={e => setFormData({...formData, mysqlUser: e.target.value})} /></div>
              <div className="space-y-2"><Label>密码</Label><Input type="password" value={formData.mysqlPassword} onChange={e => setFormData({...formData, mysqlPassword: e.target.value})} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle>工作人员账户中心 (SP_STAFF)</CardTitle>
                <CardDescription>管理所有在职/离职人员的系统权限及登录凭据。</CardDescription>
              </div>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>工号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>权限</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">管理操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map(staff => (
                  <TableRow key={staff.jobId} className="group">
                    <TableCell className="font-mono font-bold text-primary">{staff.jobId}</TableCell>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell>
                      <Badge variant={staff.permissions === '管理员' ? 'default' : 'outline'}>{staff.permissions}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={staff.status === '在职' ? 'bg-green-500' : 'bg-red-500'}>{staff.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => setEditingStaff(staff)}><Edit className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteStaff(staff.jobId)}><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-red-100 bg-red-50/20">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2"><Eraser className="size-5" /> 初始化临床库</CardTitle>
                <CardDescription>物理清空 SP_PERSON, SP_YCJG, SP_SF 等所有临床数据。</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive" className="w-full">立即清空所有患者数据</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认销毁全部临床数据？</AlertDialogTitle>
                      <AlertDialogDescription>此操作不可撤销，系统将重置为无数据状态。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => clearAllClinicalData(JSON.parse(sessionStorage.getItem('mysql_config') || '{}')).then(() => toast({ title: "临床库已重置" }))} className="bg-destructive">确认销毁</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card className="border-amber-100 bg-amber-50/20">
              <CardHeader>
                <CardTitle className="text-amber-700 flex items-center gap-2"><AlertTriangle className="size-5" /> 初始化员工库</CardTitle>
                <CardDescription>物理清空 SP_STAFF 账户信息（管理员账号也将被移除）。</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" className="w-full border-amber-300 text-amber-700">清空所有员工账户</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认清空账户库？</AlertDialogTitle>
                      <AlertDialogDescription>执行后需重新前往登录页进行 1058 管理员账户注册。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => clearAllStaffData(JSON.parse(sessionStorage.getItem('mysql_config') || '{}')).then(() => router.push('/login'))} className="bg-amber-600">确认清空</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 员工编辑弹窗 */}
      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>修改员工权限与状态 - {editingStaff?.jobId}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>姓名</Label><Input value={editingStaff?.name} onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} /></div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={editingStaff?.role} onValueChange={v => setEditingStaff({...editingStaff, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="医生">医生</SelectItem><SelectItem value="护士">护士</SelectItem><SelectItem value="其他">其他</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>权限级别</Label>
                <Select value={editingStaff?.permissions} onValueChange={v => setEditingStaff({...editingStaff, permissions: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="普通">普通人员</SelectItem><SelectItem value="管理员">管理员</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>账户状态</Label>
                <Select value={editingStaff?.status} onValueChange={v => setEditingStaff({...editingStaff, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="在职">在职</SelectItem><SelectItem value="离职">离职</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateStaff}>保存更改</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
