
'use client';

import * as React from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogIn, Settings, Server, UserCheck, Save, UserPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [jobId, setJobId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState(''); 
  const [activeTab, setActiveTab] = React.useState('login');
  const [isLoading, setIsLoading] = React.useState(false);
  
  const [mysqlConfig, setMysqlConfig] = React.useState({
    host: '172.17.168.18',
    port: '10699',
    user: 'medi_admin',
    password: 'AdminPassword123',
    database: 'meditrack_db'
  });

  React.useEffect(() => {
    if (user && !isLoading) {
      router.push('/');
    }
  }, [user, router, isLoading]);

  const handleJobIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !jobId || !password) return;
    
    setIsLoading(true);
    const internalEmail = `${jobId}@meditrack.local`;
    
    try {
      await signInWithEmailAndPassword(auth, internalEmail, password);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: "请检查工号或密码是否正确。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobIdSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !jobId || !password || !name) return;
    
    setIsLoading(true);
    const internalEmail = `${jobId}@meditrack.local`;
    
    try {
      // 1. Create the Auth account and wait for completion
      await createUserWithEmailAndPassword(auth, internalEmail, password);
      
      // 2. Once authenticated, create the Staff Profile in Firestore
      const isAdmin = jobId === '1058';
      const staffRef = doc(db, 'staffProfiles', `staff_${jobId}`);
      
      await setDoc(staffRef, {
        jobId,
        name: isAdmin ? '姜锋' : name,
        role: isAdmin ? '管理员' : '医生',
        email: internalEmail,
        status: '在职'
      }, { merge: true });

      toast({
        title: "账户已创建",
        description: `工号 ${jobId} 已成功注册并分配权限。`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "注册失败",
        description: error.message || "该工号可能已被占用或密码强度不足。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    const configRef = doc(db, 'systemConfig', 'default');
    setDoc(configRef, {
      mysql: mysqlConfig,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    toast({
      title: "全局配置已更新",
      description: "MySQL 数据库连接设置已保存。",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 size-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 size-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-primary/20 relative bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <ShieldAlert className="size-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">HealthInsight Registry</CardTitle>
          <CardDescription>
            医疗内网终端 • 重要异常结果管理系统
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" disabled={isLoading}>登 录</TabsTrigger>
              <TabsTrigger value="signup" disabled={isLoading}>注 册</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleJobIdLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jobId" className="flex items-center gap-2">
                    <UserCheck className="size-4" />
                    工号 (Job ID)
                  </Label>
                  <Input
                    id="jobId"
                    type="text"
                    placeholder="请输入工号"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">登录密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full gap-2 text-lg h-12 mt-4 shadow-md" disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
                  立即登录
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleJobIdSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">姓名</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="请输入真实姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-jobId">工号 (Job ID)</Label>
                  <Input
                    id="signup-jobId"
                    type="text"
                    placeholder="请输入工号"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">设置密码</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="至少6位字符"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <Button type="submit" variant="secondary" className="w-full gap-2 text-lg h-12 mt-4 shadow-md" disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />}
                  创建账户
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  提示：管理员账户 (1058) 注册后将自动获得系统管理权限。
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex justify-center w-full">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2">
                  <Settings className="size-4" />
                  配置中心
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Server className="size-5 text-primary" />
                    内网数据库连接配置
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>主机地址</Label>
                    <Input value={mysqlConfig.host} onChange={(e) => setMysqlConfig({...mysqlConfig, host: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>端口</Label>
                    <Input value={mysqlConfig.port} onChange={(e) => setMysqlConfig({...mysqlConfig, port: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>用户名</Label>
                    <Input value={mysqlConfig.user} onChange={(e) => setMysqlConfig({...mysqlConfig, user: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>密码</Label>
                    <Input type="password" value={mysqlConfig.password} onChange={(e) => setMysqlConfig({...mysqlConfig, password: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveConfig} className="gap-2">
                    <Save className="size-4" />
                    应用设置
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            临床系统安全监控中 • 注册与登录均受审计
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
