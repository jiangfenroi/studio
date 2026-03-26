
"use client"

import * as React from "react"
import { 
  ShieldAlert, 
  Users, 
  FileCheck, 
  AlertCircle,
  ArrowRight,
  Activity,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart } from "recharts"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchHomeStats } from "@/app/actions/mysql-sync"

// 默认内网数据库配置 (对齐 8.137.162.142)
const DEFAULT_MYSQL = {
  host: '8.137.162.142',
  port: '3306',
  user: 'root',
  password: '',
  database: 'meditrack_db'
};

export default function Home() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [mysqlStats, setMysqlStats] = React.useState<any>(null)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // 优先从 sessionStorage 读取本地配置，解决 Firestore 无法同步配置的问题
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('mysql_config') : null;
      const config = stored ? JSON.parse(stored) : DEFAULT_MYSQL;
      
      const data = await fetchHomeStats(config)
      setMysqlStats(data)
    } catch (err) {
      console.error("MySQL 统计数据获取失败")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const lineData = React.useMemo(() => {
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    return months.map((month, idx) => {
      const data = mysqlStats?.trend?.find((t: any) => t.month === idx + 1)
      const total = data?.total || 0
      const notified = data?.notified || 0
      return { month, rate: total > 0 ? Math.round((notified / total) * 100) : 0 }
    })
  }, [mysqlStats])

  const pieData = React.useMemo(() => {
    if (!mysqlStats?.categories) return []
    return mysqlStats.categories.map((c: any) => ({
      name: `${c.category}类`,
      value: c.count || 0,
      fill: c.category === 'A' ? "hsl(var(--destructive))" : "hsl(var(--primary))"
    }))
  }, [mysqlStats])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">临床业务看板</h1>
          <p className="text-muted-foreground font-medium">MySQL 数据驱动 • 本地医疗内网链路</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Activity className="size-4" />}
          同步最新数据
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "今日新增异常", value: mysqlStats?.todayNew || 0, icon: ShieldAlert, color: "text-primary" },
          { label: "待处理任务", value: mysqlStats?.pendingTasks || 0, icon: AlertCircle, color: "text-destructive" },
          { label: "全量患者档案", value: mysqlStats?.totalPatients || 0, icon: Users, color: "text-blue-600" },
          { label: "综合告知率", value: `${mysqlStats?.completionRate || 0}%`, icon: FileCheck, color: "text-green-600" },
        ].map(item => (
          <Card key={item.label} className="border-none shadow-md">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <h3 className="text-3xl font-bold">{item.value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-muted/50 ${item.color}`}><item.icon className="size-6" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader><CardTitle>随访告知趋势 (年度告知率 %)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{ rate: { label: "告知率", color: "hsl(var(--primary))" } }} className="h-[300px] w-full">
              <LineChart data={lineData}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis unit="%" tickLine={false} axisLine={false} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-rate)" }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader><CardTitle>医学分类占比</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ChartContainer config={{ value: { label: "例数" } }} className="h-[240px] w-full">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full px-4">
              {pieData.map((item: any) => (
                <div key={item.name} className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.name}</span>
                  <span className="text-lg font-bold">{item.value} <span className="text-xs font-normal">例</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-primary/5">
          <CardTitle>最近待办列表 (实时 MySQL 轮询)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {mysqlStats?.recentTasks?.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`size-2.5 rounded-full ${task.anomalyCategory === 'A' ? 'bg-destructive animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{task.patientName || "未补录"}</p>
                      <Badge variant={task.anomalyCategory === 'A' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {task.anomalyCategory}类
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">档案号: {task.patientProfileId} • 发现日期: {task.checkupDate}</p>
                  </div>
                </div>
                <Button variant="link" size="sm" asChild>
                  <Link href={`/follow-ups`}>处理 <ArrowRight className="size-3 ml-1" /></Link>
                </Button>
              </div>
            ))}
            {(!mysqlStats?.recentTasks || mysqlStats.recentTasks.length === 0) && !isLoading && (
              <div className="p-10 text-center text-muted-foreground">暂无待处理异常任务</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
