
'use client';

import * as React from 'react';
import { 
  ShieldAlert, 
  Clock, 
  Users, 
  TrendingUp, 
  Loader2,
  RefreshCcw,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchDashboardStats, fetchConfigFromMysql } from '@/app/actions/mysql-sync';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const [stats, setStats] = React.useState<any>(null);
  const [config, setConfig] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const mysqlConfig = JSON.parse(sessionStorage.getItem('mysql_config') || '{}');
      if (!mysqlConfig.host) throw new Error('数据库配置缺失');
      
      const [statsData, remoteConfig] = await Promise.all([
        fetchDashboardStats(mysqlConfig),
        fetchConfigFromMysql(mysqlConfig)
      ]);
      
      setStats(statsData);
      setConfig(remoteConfig);
    } catch (err: any) {
      toast({ variant: "destructive", title: "数据加载失败", description: "请检查 MySQL 核心链路状态。" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  const chartData = stats?.trend?.map((t: any) => ({
    month: t.month,
    rate: t.total > 0 ? Math.round((t.followed / t.total) * 100) : 0,
    total: t.total,
    followed: t.followed
  })) || [];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-primary">{config?.appName || "重要异常结果管理终端"}</h1>
          <p className="text-muted-foreground font-medium">100% MySQL 核心驱动 • 中心化管理架构</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-full hover:bg-muted transition-colors">
          <RefreshCcw className={`size-5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "今日新增异常", value: stats?.todayNew || 0, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
          { label: "待处理随访", value: stats?.pendingTasks || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "档案库总量", value: stats?.totalPatients || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "月度告知率", value: chartData[0]?.rate ? `${chartData[0].rate}%` : "0%", icon: Activity, color: "text-green-600", bg: "bg-green-50" },
        ].map(item => (
          <Card key={item.label} className="border-none shadow-md overflow-hidden hover:scale-[1.02] transition-transform">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <h3 className="text-3xl font-bold">{item.value}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${item.bg} ${item.color}`}>
                  <item.icon className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              随访告知趋势 (月度统计 %)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "white", stroke: "hsl(var(--primary))", strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-primary text-primary-foreground">
          <CardHeader><CardTitle>内网中心服务状态</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 bg-white/10 rounded-xl space-y-2 border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">MySQL 通讯链路</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                <span className="text-sm">中心库联通正常</span>
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl space-y-2 border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">数据同步策略</p>
              <p className="text-xs leading-relaxed">
                当前系统正以本地化计算模式运行。所有临床记录、账户权限及系统配置均实时保存至中心数据库，实现一次配置，全院同步。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
