
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, LogIn, Database, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { authenticateUser, registerUser, checkConnection } from '@/app/actions/mysql-sync';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [jobId, setJobId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [authCode, setAuthCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  
  // 中心数据库默认配置 (内网环境)
  const [mysqlConfig, setMysqlConfig] = React.useState({
    host: '8.137.162.142',
    port: '3306',
    user: 'root',
    password: '',
    database: 'meditrack_db'
  });

  const handleTestConnection = async () => {
    setIsConnecting(true);
    try {
      await checkConnection(mysqlConfig);
      setIsConnected(true);
      sessionStorage.setItem('mysql_config', JSON.stringify(mysqlConfig));
      toast({ title: "数据库连接成功", description: "配置已同步至本地会话。" });
    } catch (err: any) {
      setIsConnected(false);
      toast({ variant: "destructive", title: "连接失败", description: err.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast({ variant: "destructive", title: "请先测试数据库连接", description: "必须成功连接中心库后方可操作。" });
      return;
    }
    setIsLoading(true);
    try {
      const user = await authenticateUser(mysqlConfig, jobId, password);
      if (user) {
        sessionStorage.setItem('staff_user', JSON.stringify(user));
        toast({ title: "登录成功", description: `欢迎回来，${user.name}` });
        router.push('/');
      } else {
        toast({ variant: "destructive", title: "验证失败", description: "工号或密码不正确。" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "操作异常", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast({ variant: "destructive", title: "请先测试数据库连接", description: "必须成功连接中心库后方可操作。" });
      return;
    }
    if (authCode !== 'HEALTH-INSIGHT-2025') {
      toast({ variant: "destructive", title: "授权密钥错误", description: "请输入有效的内网注册密钥。" });
      return;
    }
    setIsLoading(true);
    try {
      const staffData = { jobId, password, name, role: '医生' };
      await registerUser(mysqlConfig, staffData);
      toast({ title: "注册成功", description: "账户信息已同步至中心库，请登录。" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "注册失败", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-white/95 border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-primary shadow-lg ring-4 ring-primary/10">
              <ShieldAlert className="size-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">HealthInsight Registry</CardTitle>
          <CardDescription>医疗内网重要异常结果管理终端 (MySQL 驱动)</CardDescription>
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
                <Button type="submit" className="w-full h-11 shadow-md" disabled={isLoading || !isConnected}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                  立即进入系统
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
                  <Input 
                    type="password"
                    value={authCode} 
                    onChange={(e) => setAuthCode(e.target.value)} 
                    required 
                    placeholder="请输入内网分发的 10 位密钥" 
                  />
                </div>
                <Button type="submit" variant="secondary" className="w-full h-11 shadow-sm" disabled={isLoading || !isConnected}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />}
                  确认注册
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <div className="flex flex-col gap-3 w-full p-4 bg-muted/50 rounded-xl border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Database className="size-3" /> 内网中心数据库配置
              </p>
              {isConnected && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[8px] px-1 h-4">已联通</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8 text-xs bg-white" value={mysqlConfig.host} onChange={e => setMysqlConfig({...mysqlConfig, host: e.target.value})} placeholder="主机IP" />
              <Input className="h-8 text-xs bg-white" value={mysqlConfig.port} onChange={e => setMysqlConfig({...mysqlConfig, port: e.target.value})} placeholder="端口" />
              <Input className="h-8 text-xs bg-white" value={mysqlConfig.user} onChange={e => setMysqlConfig({...mysqlConfig, user: e.target.value})} placeholder="账户" />
              <Input className="h-8 text-xs bg-white" type="password" value={mysqlConfig.password} onChange={e => setMysqlConfig({...mysqlConfig, password: e.target.value})} placeholder="密码" />
            </div>
            <Button 
              type="button" 
              variant={isConnected ? "outline" : "default"} 
              className="h-9 text-xs w-full gap-2" 
              onClick={handleTestConnection}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="size-3 animate-spin" /> : isConnected ? <CheckCircle2 className="size-3 text-green-600" /> : <Database className="size-3" />}
              {isConnected ? "应用并同步" : "测试连通性"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
