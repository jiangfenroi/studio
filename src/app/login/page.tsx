
'use client';

import * as React from 'react';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogIn, Settings, UserPlus, Loader2, KeyRound, Database, Server, Globe, Lock, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { syncStaffToMysql, testMysqlConnection } from '@/app/actions/mysql-sync';

// 系统预设注册授权码
const SYSTEM_AUTH_CODE = "HEALTH-INSIGHT-2025";

/**
 * 登录与注册页面
 * 针对医疗内网优化：移除 Firestore 写入，配置仅存于本地及 MySQL 数据库。
 */
export default function LoginPage() {
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [jobId, setJobId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState(''); 
  const [authCode, setAuthCode] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('login');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  
  // 默认数据库配置 (对应用户提供的信息)
  const [mysqlConfig, setMysqlConfig] = React.useState({
    host: '8.137.162.142',
    port: '3306',
    user: 'root',
    password: '', // 提示：请根据实际情况在界面输入
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
        description: "请检查工号或密码是否正确。如为首次使用，请先注册。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobIdSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !jobId || !password || !name) return;
    
    if (authCode !== SYSTEM_AUTH_CODE) {
      toast({
        variant: "destructive",
        title: "授权码错误",
        description: "请输入有效的系统验证编码。",
      });
      return;
    }

    setIsLoading(true);
    const internalEmail = `${jobId}@meditrack.local`;
    
    try {
      // 1. 先验证 MySQL 连接，防止注册成功但数据同步失败
      const testResult = await testMysqlConnection(mysqlConfig);
      if (!testResult.success) {
        throw new Error(`MySQL 同步失败，请先检查数据库连接配置。${testResult.message}`);
      }

      // 2. 创建 Firebase 账户 (仅作为令牌验证)
      await createUserWithEmailAndPassword(auth, internalEmail, password);
      
      const isAdmin = jobId === '1058';
      const staffData = {
        jobId,
        name: name,
        role: isAdmin ? '管理员' : '医生',
        email: internalEmail,
        status: '在职'
      };
      
      // 3. 直接同步到 MySQL
      await syncStaffToMysql(mysqlConfig, staffData, 'SAVE');

      toast({
        title: "账户已创建",
        description: `工号 ${jobId} 已同步至 MySQL 中心数据库。`,
      });
      setActiveTab('login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "操作失败",
        description: error.message || "注册过程中发生错误，请检查网络或工号是否重复。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testMysqlConnection(mysqlConfig);
      if (result.success) {
        toast({ title: "连接成功", description: result.message });
      } else {
        toast({ variant: "destructive", title: "连接失败", description: result.message });
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      // 验证连接
      const result = await testMysqlConnection(mysqlConfig);
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // 将配置临时保存在 SessionStorage，确保页面刷新后不丢失
      sessionStorage.setItem('mysql_config', JSON.stringify(mysqlConfig));
      
      toast({
        title: "配置已应用",
        description: "系统将使用指定的 MySQL 数据库进行业务交互。",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "应用失败",
        description: `数据库连接无效: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      <Card className="w-full max-w-md shadow-2xl relative bg-white/80 backdrop-blur-sm border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <ShieldAlert className="size-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">HealthInsight Registry</CardTitle>
          <CardDescription>医疗内网终端 • 纯 MySQL 驱动</CardDescription>
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
                  <Label htmlFor="jobId">工号 (Job ID)</Label>
                  <Input id="jobId" value={jobId} onChange={(e) => setJobId(e.target.value)} required placeholder="请输入您的工号" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">登录密码</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full h-12 mt-4 shadow-md text-base" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2 size-5" />}
                  立即登录
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleJobIdSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label>真实姓名</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="例如：宫医生" />
                </div>
                <div className="space-y-2">
                  <Label>工号</Label>
                  <Input value={jobId} onChange={(e) => setJobId(e.target.value)} required placeholder="例如：1058" />
                </div>
                <div className="space-y-2">
                  <Label>设置密码</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="建议包含字母与数字" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-primary font-bold">
                    <KeyRound className="size-4" /> 系统授权码
                  </Label>
                  <Input 
                    type="text" 
                    value={authCode} 
                    onChange={(e) => setAuthCode(e.target.value)} 
                    required 
                    placeholder="请输入系统授权验证编码"
                    className="border-primary/30"
                  />
                </div>
                <Button type="submit" variant="secondary" className="w-full h-12 mt-4 shadow-md text-base" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2 size-5" />}
                  确认注册
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6 mt-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary transition-colors">
                <Settings className="mr-2 size-4" />配置中心 MySQL 数据库
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Database className="size-5 text-primary" />
                  数据库连接配置
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 py-6">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-1"><Server className="size-3" /> 主机</Label>
                  <Input value={mysqlConfig.host} onChange={(e) => setMysqlConfig({...mysqlConfig, host: e.target.value})} className="col-span-3" placeholder="8.137.162.142" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-1"><Globe className="size-3" /> 端口</Label>
                  <Input value={mysqlConfig.port} onChange={(e) => setMysqlConfig({...mysqlConfig, port: e.target.value})} className="col-span-3" placeholder="3306" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-1"><Database className="size-3" /> 库名</Label>
                  <Input value={mysqlConfig.database} onChange={(e) => setMysqlConfig({...mysqlConfig, database: e.target.value})} className="col-span-3" placeholder="meditrack_db" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-1"><UserIcon className="size-3" /> 用户</Label>
                  <Input value={mysqlConfig.user} onChange={(e) => setMysqlConfig({...mysqlConfig, user: e.target.value})} className="col-span-3" placeholder="root" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right flex items-center justify-end gap-1"><Lock className="size-3" /> 密码</Label>
                  <Input type="password" value={mysqlConfig.password} onChange={(e) => setMysqlConfig({...mysqlConfig, password: e.target.value})} className="col-span-3" placeholder="••••••••" />
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-3 sm:flex-row">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection} 
                  disabled={isTestingConnection}
                  className="flex-1 gap-2"
                >
                  {isTestingConnection ? <Loader2 className="size-4 animate-spin" /> : <AlertCircle className="size-4" />}
                  测试连通性
                </Button>
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isLoading}
                  className="flex-1 gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  应用并同步
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
