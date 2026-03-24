'use client';

import * as React from 'react';
import { useAuth, useUser, initiateEmailSignIn, initiateAnonymousSignIn, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogIn, UserCircle, Settings, Save, Database, Server } from 'lucide-react';
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
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  // System Config State
  const configRef = useMemoFirebase(() => doc(db, 'systemConfig', 'default'), [db]);
  const { data: config } = useDoc(configRef);
  
  // Local states for settings dialog (MySQL only)
  const [mysqlConfig, setMysqlConfig] = React.useState({
    host: '',
    port: '3306',
    user: '',
    password: '',
    database: ''
  });

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (config && config.mysql) {
      setMysqlConfig(config.mysql);
    }
  }, [config]);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (auth && email && password) {
      initiateEmailSignIn(auth, email, password);
    }
  };

  const handleGuestLogin = () => {
    if (auth) {
      initiateAnonymousSignIn(auth);
    }
  };

  const handleSaveConfig = () => {
    if (configRef) {
      setDocumentNonBlocking(configRef, {
        mysql: mysqlConfig,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      toast({
        title: "全局配置已更新",
        description: "MySQL 数据库连接设置已成功保存。",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 size-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 size-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-primary/20 relative bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
              <ShieldAlert className="size-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">HealthInsight Registry</CardTitle>
          <CardDescription>
            体检重要异常结果管理系统 • 医疗内网登录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">工号/邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">登录密码</Label>
              <Input
                id="password"
                type="password"
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
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或者</span>
            </div>
          </div>
          <Button variant="outline" className="w-full gap-2 h-12 hover:bg-primary/5" onClick={handleGuestLogin}>
            <UserCircle className="size-5" />
            以游客/匿名身份访问
          </Button>
          
          <div className="flex justify-center w-full mt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2">
                  <Settings className="size-4" />
                  内网数据库设置
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Server className="size-5 text-primary" />
                    内网系统配置中心
                  </DialogTitle>
                  <DialogDescription>
                    配置本系统所需的 MySQL 业务数据库连接。PDF 存储路径请登录后在系统设置中调整。
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="mysql" className="w-full mt-4">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="mysql" className="gap-2">
                      <Database className="size-4" />
                      MySQL 数据库
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="mysql" className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>主机地址 (Host)</Label>
                        <Input 
                          placeholder="localhost" 
                          value={mysqlConfig.host}
                          onChange={(e) => setMysqlConfig({...mysqlConfig, host: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>端口 (Port)</Label>
                        <Input 
                          placeholder="3306" 
                          value={mysqlConfig.port}
                          onChange={(e) => setMysqlConfig({...mysqlConfig, port: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>用户名 (User)</Label>
                        <Input 
                          placeholder="root" 
                          value={mysqlConfig.user}
                          onChange={(e) => setMysqlConfig({...mysqlConfig, user: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>密码 (Password)</Label>
                        <Input 
                          type="password"
                          value={mysqlConfig.password}
                          onChange={(e) => setMysqlConfig({...mysqlConfig, password: e.target.value})}
                        />
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label>数据库名 (Database)</Label>
                        <Input 
                          placeholder="health_insight_db" 
                          value={mysqlConfig.database}
                          onChange={(e) => setMysqlConfig({...mysqlConfig, database: e.target.value})}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="border-t pt-4">
                  <Button onClick={handleSaveConfig} className="gap-2 w-full md:w-auto">
                    <Save className="size-4" />
                    保存数据库配置
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-2">
            内网环境安全监控中，请妥善保管您的登录凭证
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
