
'use client';

import * as React from 'react';
import { useAuth, useUser, initiateEmailSignIn, initiateAnonymousSignIn } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogIn, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
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
              />
            </div>
            <Button type="submit" className="w-full gap-2 text-lg h-12 mt-4">
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
          <Button variant="outline" className="w-full gap-2 h-12" onClick={handleGuestLogin}>
            <UserCircle className="size-5" />
            以游客/匿名身份访问
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            内网环境安全监控中，请妥善保管您的登录凭证
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
