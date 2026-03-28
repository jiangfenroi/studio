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
  Activity,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { fetchDashboardStats, fetchConfigFromMysql } from '@/app/actions/mysql-sync';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HomePage() {
  const [stats, setStats] = React.useState<any>(null);
  const [config, setConfig] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear().toString());
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const mysqlConfigString = sessionStorage.getItem('mysql_config');
      if (!mysqlConfigString) {
        setIsLoading(false);
        return;
      }
      const mysqlConfig = JSON.parse(mysqlConfigString);
      if (!mysqlConfig.host) {
        setIsLoading(false);
        return;
      }
      
      const [statsData, remoteConfig] = await Promise.all([
        fetchDashboardStats(mysqlConfig, parseInt(selectedYear)),
        fetchConfigFromMysql(mysqlConfig)
      ]);
      
      setStats(statsData);
      setConfig(remoteConfig);
    } catch (err: any) {
      toast({ variant: "destructive", title: "数据加载失败", description: "请检查 MySQL 核心链路状态。" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedYear]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = React.useMemo(() => {
    if (!stats?.trend) return [];
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0');
      return `${selectedYear}-${month}`;
    });
    return months.map(m => {
      const found = stats.trend.find((t: any) => t.month === m);
      const total = Number(found?.total || 0);
      const followed = Number(found?.followed || 0);
      // 鲁棒性计算：确保分母大于0且结果为有限数值
      const rate = total > 0 ? Math.round((followed / total) * 100) : 0;
      return {
        month: m.split('-')[1] + '月',
        rate: rate,
        total: total,
        followed: followed
      };
    });
  }, [stats, selectedYear]);

  const annualRate = React.useMemo(() => {
    if (!chartData.length) return 0;
    const total = chartData.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const followed = chartData.reduce((acc, curr) => acc + (Number(curr.followed) || 0), 0);
    return total > 0 ? Math.round((followed / total) * 100) : 0;
  }, [chartData]);

  if (isLoading && !stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">{config?.appName || "重要异常结果管理终端"}</h1>
          <p className="text-muted-foreground font-medium">100% MySQL 核心驱动 • 中心化随访率统计系统</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] bg-white">
              <Calendar className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}年度</SelectItem>)}
            </SelectContent>
          </Select>
          <button onClick={loadData} className="p-2 rounded-full hover:bg-muted transition-colors">
            <RefreshCcw className={`size-5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "今日新增异常", value: stats?.todayNew || 0, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
          { label: "待处理随访", value: stats?.pendingTasks || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "档案库总量", value: stats?.totalPatients || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: `${selectedYear}年度随访率`, value: `${annualRate}%`, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
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
        <Card className="lg:col-span-2 border-none shadow-lg bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              {selectedYear}年度 月重要异常结果随访率(按通知月统计)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'rate') return [`${value}%`, '随访率'];
                    if (name === 'total') return [value, '重要异常结果例数'];
                    if (name === 'followed') return [value, '已随访例数'];
                    return [value, name];
                  }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Line 
                  name="total"
                  type="monotone" 
                  dataKey="total" 
                  stroke="transparent" 
                  strokeWidth={0}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
                <Line 
                  name="followed"
                  type="monotone" 
                  dataKey="followed" 
                  stroke="transparent" 
                  strokeWidth={0}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
                <Line 
                  name="rate"
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: "white", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-primary text-primary-foreground flex flex-col">
          <CardHeader><CardTitle>内网统计逻辑说明</CardTitle></CardHeader>
          <CardContent className="space-y-6 pt-4 flex-1">
            <div className="p-5 bg-white/10 rounded-2xl space-y-3 border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">统计归口准则</p>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  系统严格按“通知日期”进行统计归口。例如 12 月的体检结果在次年 1 月通知，该数据将计入次年 1 月。
                </p>
              </div>
            </div>
            
            <div className="p-5 bg-white/10 rounded-2xl space-y-3 border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">数据追溯</p>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  年度随访率基于全量通知任务实时聚合。任何月份补录的随访结果都将实时更新对应通知月份的重要异常结果随访率。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}