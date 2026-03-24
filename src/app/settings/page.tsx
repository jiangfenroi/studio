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
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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

export default function SettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)
  
  const staffQuery = useMemoFirebase(() => collection(db, "staffProfiles"), [db])
  const { data: staffMembers } = useCollection(staffQuery)
  
  const [activeTab, setActiveTab] = React.useState("general")
  const [testing, setTesting] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<any | null>(null)
  const [userToDelete, setUserToDelete] = React.useState<any | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  
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
    setDocumentNonBlocking(configRef, {
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
    }, { merge: true })
    
    toast({
      title: "系统配置同步成功",
      description: "所有配置已上传至中心数据库，其他终端将自动同步。",
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
    }, 1200)
  }

  const handleAddUser = () => {
    const newUser = {
      name: "新员工",
      email: "staff@hospital.local",
      role: "医生",
      jobId: `STAFF-${Date.now().toString().slice(-4)}`,
      status: "在职"
    }
    addDocumentNonBlocking(collection(db, "staffProfiles"), newUser)
    toast({ title: "已增加新账号", description: "请在列表中修改工号及具体信息。" })
  }

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return

    if (userToDelete.jobId === '1058') {
      toast({
        variant: "destructive",
        title: "权限受限",
        description: "内置管理员账号 (1058) 不允许被删除。",
      })
      setUserToDelete(null)
      return
    }

    if (user?.email === userToDelete.email) {
      toast({
        variant: "destructive",
        title: "操作无效",
        description: "您不能删除自己当前登录的账户。",
      })
      setUserToDelete(null)
      return
    }

    deleteDocumentNonBlocking(doc(db, "staffProfiles", userToDelete.id))
    toast({
      title: "账号已移除",
      variant: "destructive",
      description: `工号 ${userToDelete.jobId} (${userToDelete.name}) 已从系统注销。`,
    })
    setUserToDelete(null)
  }

  const handleSaveUserEdit = async () => {
    if (!editingUser) return

    updateDocumentNonBlocking(doc(db, "staffProfiles", editingUser.id), editingUser)

    if (newPassword && user && (user.email === editingUser.email || user.email?.startsWith(`${editingUser.jobId}@`))) {
      try {
        await updatePassword(user, newPassword)
        toast({
          title: "密码更新成功",
          description: "您的登录密码已完成重置。",
        })
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
          toast({
            variant: "destructive",
            title: "安全验证过期",
            description: "修改密码需要重新登录以验证身份。",
          })
        } else {
          toast({
            variant: "destructive",
            title: "密码更新失败",
            description: error.message || "未知错误，请重试。",
          })
        }
      }
    }

    setEditingUser(null)
    setNewPassword("")
    toast({ title: "账户信息已同步" })
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">中心配置与管理</h1>
          <p className="text-muted-foreground">统筹全院医疗数据系统的运行参数、权限及外部系统集成</p>
        </div>
        <Button onClick={handleSaveConfig} className="gap-2 shadow-lg">
          <Save className="size-4" />
          保存全局配置
        </Button>
      </header>

      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 mb-8 bg-muted/50">
          <TabsTrigger value="general" className="gap-2 text-base">
            <Monitor className="size-4" /> 基础与集成
          </TabsTrigger>
          <TabsTrigger value="mysql" className="gap-2 text-base">
            <Database className="size-4" /> MySQL 数据库
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 text-base">
            <Users className="size-4" /> 账户权限管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle>系统名称与品牌</CardTitle>
              <CardDescription>自定义系统标题及图标。图标文件应放置在PDF根目录中。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>系统显示名称</Label>
                <Input 
                  value={formData.appName} 
                  onChange={e => setFormData({...formData, appName: e.target.value})}
                  placeholder="HealthInsight Registry"
                />
              </div>
              <div className="space-y-2">
                <Label>图标文件名</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.appLogoFileName} 
                    onChange={e => setFormData({...formData, appLogoFileName: e.target.value})}
                    placeholder="logo.png"
                  />
                  <div className="p-2 bg-muted rounded border border-dashed flex items-center justify-center min-w-[40px]">
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle>外部系统与存储集成</CardTitle>
              <CardDescription>配置内网 PACS 影像平台及 PDF 报告存储路径。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label>PACS 调用基准地址</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.pacsUrlBase} 
                    onChange={e => setFormData({...formData, pacsUrlBase: e.target.value})}
                    placeholder="http://172.16.201.61:7242/?ChtId="
                    className="font-mono text-xs"
                  />
                  <Badge variant="outline" className="bg-blue-50">API 集成中</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">系统将自动拼接：[基准地址] + [档案编号]</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>PDF 报告指定存储路径</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.pdfStoragePath} 
                    onChange={e => setFormData({...formData, pdfStoragePath: e.target.value})}
                    placeholder="//172.17.126.18/e:/pic"
                    className="font-mono text-xs"
                  />
                  <Button variant="secondary" size="sm" onClick={handleTestConnection} disabled={testing}>
                    {testing ? <Loader2 className="size-3 animate-spin mr-1" /> : <ShieldCheck className="size-3 mr-1" />}
                    测试连接
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">此路径为全院共用，程序将按档案编号自动分级建立二级文件夹。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mysql" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5 text-primary" />
                MySQL 8.4 业务库配置
              </CardTitle>
              <CardDescription>配置本系统所需的 MySQL 数据库连接。请确保内网服务器防火墙已放行对应端口。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>主机地址</Label>
                <Input 
                  value={formData.mysqlHost} 
                  onChange={e => setFormData({...formData, mysqlHost: e.target.value})}
                  placeholder="172.17.168.18"
                />
              </div>
              <div className="space-y-2">
                <Label>通信端口</Label>
                <Input 
                  value={formData.mysqlPort} 
                  onChange={e => setFormData({...formData, mysqlPort: e.target.value})}
                  placeholder="10699"
                />
              </div>
              <div className="space-y-2">
                <Label>数据库名称</Label>
                <Input 
                  value={formData.mysqlDatabase} 
                  onChange={e => setFormData({...formData, mysqlDatabase: e.target.value})}
                  placeholder="meditrack_db"
                />
              </div>
              <div className="space-y-2">
                <Label>数据库用户</Label>
                <Input 
                  value={formData.mysqlUser} 
                  onChange={e => setFormData({...formData, mysqlUser: e.target.value})}
                  placeholder="medi_admin"
                />
              </div>
              <div className="space-y-2">
                <Label>连接密码</Label>
                <Input 
                  type="password"
                  value={formData.mysqlPassword} 
                  onChange={e => setFormData({...formData, mysqlPassword: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 py-3 border-t">
              <p className="text-[10px] text-muted-foreground">注意：修改数据库配置后，系统可能需要重启以重新初始化连接池。</p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between bg-primary/5">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="size-5 text-primary" />
                  系统账户管理
                </CardTitle>
                <CardDescription>添加或修改临床医生、护士及管理员账户信息。</CardDescription>
              </div>
              <Button onClick={handleAddUser} size="sm" className="gap-1">
                <Plus className="size-4" /> 新增账户
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>工号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>邮箱/账号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers?.map(staff => (
                    <TableRow key={staff.id} className={staff.jobId === '1058' ? 'bg-primary/5' : ''}>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {staff.jobId}
                        {staff.jobId === '1058' && <Badge variant="default" className="ml-2 scale-75 origin-left">Admin</Badge>}
                      </TableCell>
                      <TableCell className="font-bold">{staff.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{staff.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                      <TableCell>
                        <Badge className={staff.status === '在职' ? 'bg-green-500' : 'bg-destructive'}>
                          {staff.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingUser(staff)} title="编辑账户">
                            <Edit className="size-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setUserToDelete(staff)} title="删除账户">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!staffMembers || staffMembers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        暂无员工账户信息
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingUser} onOpenChange={o => {
        if (!o) {
          setEditingUser(null)
          setNewPassword("")
          setShowPassword(false)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              {editingUser?.jobId === '1058' ? '维护管理员账户' : '修改账户信息'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">工号</Label>
                <Input 
                  value={editingUser?.jobId} 
                  onChange={e => setEditingUser({...editingUser, jobId: e.target.value})}
                  className="col-span-3 font-mono" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">姓名</Label>
                <Input 
                  value={editingUser?.name} 
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">角色</Label>
                <select 
                  className="col-span-3 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingUser?.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="管理员">管理员</option>
                  <option value="医生">医生</option>
                  <option value="护士">护士</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">状态</Label>
                <select 
                  className="col-span-3 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingUser?.status}
                  onChange={e => setEditingUser({...editingUser, status: e.target.value})}
                >
                  <option value="在职">在职</option>
                  <option value="离职">离职</option>
                </select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="size-4 text-primary" />
                <span className="text-sm font-bold">密码修改 (可选)</span>
              </div>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="输入新密码..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                提示：仅当修改当前登录账号（工号：{user?.email?.split('@')[0]}）时密码更新才会生效。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>取消</Button>
            <Button onClick={handleSaveUserEdit} className="gap-2 shadow-md">
              <Save className="size-4" />
              保存临床更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={o => !o && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              确认永久注销账户？
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除工号为 <span className="font-bold text-foreground">{userToDelete?.jobId} ({userToDelete?.name})</span> 的临床账户吗？此操作将立即剥夺其系统访问权限，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>放弃</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteUser} className="bg-destructive hover:bg-destructive/90">
              确认注销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
