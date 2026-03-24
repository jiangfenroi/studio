
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
import { syncStaffToMysql, syncConfigToMysql } from '@/app/actions/mysql-sync';

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
      await createUserWithEmailAndPassword(auth, internalEmail, password);
      
      const isAdmin = jobId === '1058';
      const staffData = {
        jobId,
        name: isAdmin ? '姜锋' : name,
        role: isAdmin ? '管理员' : '医生',
        email: internalEmail,
        status: '在职'
      };
      
      const staffRef = doc(db, 'staffProfiles', `staff_${jobId}`);
      await setDoc(staffRef, staffData, { merge: true });

      // 同步到 MySQL SP_STAFF
      await syncStaffToMysql(mysqlConfig, staffData, 'SAVE');

      toast({
        title: "账户已创建",
        description: `工号 ${jobId} 已注册并同步至中心 MySQL 数据库。`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "注册失败",
        description: error.message || "该工号可能已被占用。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    const configData = {
      mysql: mysqlConfig,
      lastUpdated: new Date().toISOString()
    };
    
    const configRef = doc(db, 'systemConfig', 'default');
    await setDoc(configRef, configData, { merge: true });
    
    // 同步到 MySQL SP_CONFIG
    await syncConfigToMysql(mysqlConfig, { ...configData, appName: 'HealthInsight' });
    
    toast({
      title: "全局配置已更新",
      description: "MySQL 数据库连接设置已保存并同步至中心库。",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      <Card className="w-full max-w-md shadow-2xl relative bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <ShieldAlert className="size-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">HealthInsight Registry</CardTitle>
          <CardDescription>医疗内网终端 • 数据同步管理系统</CardDescription>
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
                  <Input id="jobId" value={jobId} onChange={(e) => setJobId(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">登录密码</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full h-12 mt-4 shadow-md" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                  立即登录
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleJobIdSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label>姓名</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>工号</Label>
                  <Input value={jobId} onChange={(e) => setJobId(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>设置密码</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" variant="secondary" className="w-full h-12 mt-4 shadow-md" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />}
                  创建账户
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" size="sm"><Settings className="mr-2" />配置中心</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>内网数据库连接配置</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <Input value={mysqlConfig.host} onChange={(e) => setMysqlConfig({...mysqlConfig, host: e.target.value})} placeholder="主机" />
                <Input value={mysqlConfig.user} onChange={(e) => setMysqlConfig({...mysqlConfig, user: e.target.value})} placeholder="用户" />
                <Input type="password" value={mysqlConfig.password} onChange={(e) => setMysqlConfig({...mysqlConfig, password: e.target.value})} placeholder="密码" />
              </div>
              <DialogFooter><Button onClick={handleSaveConfig}>应用设置</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
