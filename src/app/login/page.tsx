
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, LogIn, Database, UserPlus, Loader2, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { authenticateUser, registerUser } from '@/app/actions/mysql-sync';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [jobId, setJobId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [authCode, setAuthCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  
  // 中心数据库默认配置 (内网环境)
  const [mysqlConfig, setMysqlConfig] = React.useState({
    host: '8.137.162.142',
    port: '3306',
    user: 'root',
    password: '',
    database: 'meditrack_db'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await authenticateUser(mysqlConfig, jobId, password);
      if (user) {
        sessionStorage.setItem('staff_user', JSON.stringify(user));
        sessionStorage.setItem('mysql_config', JSON.stringify(mysqlConfig));
        toast({ title: "登录成功", description: `欢迎回来，${user.name}` });
        router.push('/');
      } else {
        toast({ variant: "destructive", title: "验证失败", description: "工号或密码不正确。" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "数据库连接错误", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode !== 'HEALTH-INSIGHT-2025') {
      toast({ variant: "destructive", title: "授权密钥错误", description: "请输入有效的内网注册密钥。" });
      return;
    }
    setIsLoading(true);
    try {
      const staffData = { jobId, password, name, role: '医生' };
      await registerUser(mysqlConfig, staffData);
      toast({ title: "注册成功", description: "账户信息已同步至中心 MySQL。" });
      setJobId(jobId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "注册失败", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-white/95">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-primary shadow-lg">
              <ShieldAlert className="size-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">HealthInsight Registry</CardTitle>
          <CardDescription>重要异常结果管理系统 (MySQL 终端)</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">账号登录</TabsTrigger>
              <TabsTrigger value="signup">内网注册</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>工号 / 账号</Label>
                  <Input value={jobId} onChange={(e) => setJobId(e.target.value)} required placeholder="请输入您的工号" />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                  立即登录
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>工号</Label>
                    <Input value={jobId} onChange={(e) => setJobId(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>真实姓名</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>设置密码</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-primary font-bold">注册授权密钥</Label>
                  <Input value={authCode} onChange={(e) => setAuthCode(e.target.value)} required placeholder="HEALTH-INSIGHT-2025" />
                </div>
                <Button type="submit" variant="secondary" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />}
                  同步至中心库
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <div className="flex flex-col gap-2 w-full p-3 bg-muted/50 rounded-lg">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">内网 MySQL 连接配置</p>
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-7 text-xs" value={mysqlConfig.host} onChange={e => setMysqlConfig({...mysqlConfig, host: e.target.value})} placeholder="主机IP" />
              <Input className="h-7 text-xs" value={mysqlConfig.port} onChange={e => setMysqlConfig({...mysqlConfig, port: e.target.value})} placeholder="端口" />
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
