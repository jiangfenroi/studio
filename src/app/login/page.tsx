'use client';

import * as React from 'react';
import { useAuth, useUser, initiateEmailSignIn, initiateAnonymousSignIn, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogIn, UserCircle, Settings, Save, HardDrive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [tempStoragePath, setTempStoragePath] = React.useState('');

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (config?.pdfStoragePath) {
      setTempStoragePath(config.pdfStoragePath);
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
        pdfStoragePath: tempStoragePath,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      toast({
        title: "配置已更新",
        description: "系统数据库存储路径已成功保存。",
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
                  数据库/存储设置
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <HardDrive className="size-5 text-primary" />
                    内网数据库存储配置
                  </DialogTitle>
                  <DialogDescription>
                    配置本系统PDF报告的物理存储路径。该路径将作为全院报告归档的根目录。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="dbPath">PDF 存储根路径</Label>
                    <Input 
                      id="dbPath" 
                      placeholder="//172.17.126.18/e:/pic" 
                      value={tempStoragePath}
                      onChange={(e) => setTempStoragePath(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      格式参考: <code className="bg-muted px-1 rounded">ftp://IP/path</code> 或 <code className="bg-muted px-1 rounded">//IP/drive:/path</code>
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveConfig} className="gap-2">
                    <Save className="size-4" />
                    保存配置
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
