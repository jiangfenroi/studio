
'use client';

import * as React from 'react';
import { useAuth, useUser, initiateEmailSignIn, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogIn, UserCircle, Settings, Save, Database, Server, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [jobId, setJobId] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  // Local states for settings dialog
  const [mysqlConfig, setMysqlConfig] = React.useState({
    host: '172.17.168.18',
    port: '10699',
    user: 'medi_admin',
    password: 'AdminPassword123',
    database: 'meditrack_db'
  });

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleJobIdLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (auth && jobId && password) {
      // Internal mapping for hospital Job ID
      const internalEmail = `${jobId}@meditrack.local`;
      initiateEmailSignIn(auth, internalEmail, password);
      
      // Specifically ensure Admin 1058 exists in the profiles
      if (jobId === '1058') {
        const adminProfileRef = doc(db, 'staffProfiles', 'admin_1058');
        setDocumentNonBlocking(adminProfileRef, {
          jobId: '1058',
          name: '姜锋',
          role: '管理员',
          email: internalEmail,
          status: '在职'
        }, { merge: true });
      }
    }
  };

  const handleSaveConfig = () => {
    const configRef = doc(db, 'systemConfig', 'default');
    setDocumentNonBlocking(configRef, {
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
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full gap-2 text-lg h-12 mt-4 shadow-md">
              <LogIn className="size-5" />
              立即登录
            </Button>
          </form>
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
            临床系统安全监控中 • 登录操作将被审计
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
