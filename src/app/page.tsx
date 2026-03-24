"use client"

import * as React from "react"
import { 
  ShieldAlert, 
  Users, 
  FileCheck, 
  TrendingUp,
  AlertCircle,
  Calendar,
  ArrowRight,
  Activity,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { fetchHomeStats } from "@/app/actions/mysql-sync"

const lineChartConfig = {
  rate: {
    label: "随访率 (%)",
    color: "hsl(var(--primary))",
  }
}

const pieChartConfig = {
  value: {
    label: "病例数",
  },
  "A类 (危急)": {
    label: "A类 (危急)",
    color: "hsl(var(--destructive))",
  },
  "B类 (重要)": {
    label: "B类 (重要)",
    color: "hsl(var(--primary))",
  },
}

export default function Home() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentDate, setCurrentDate] = React.useState("")
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear().toString())
  const [mysqlStats, setMysqlStats] = React.useState<any>(null)

  const configRef = useMemoFirebase(() => doc(db, 'systemConfig', 'default'), [db])
  const { data: config } = useDoc(configRef)

  const loadData = React.useCallback(async () => {
    if (!config?.mysql) return
    setIsLoading(true)
    try {
      const data = await fetchHomeStats(config.mysql)
      setMysqlStats(data)
    } catch (err) {
      console.error("Home MySQL Data Load Failed")
    } finally {
      setIsLoading(false)
    }
  }, [config])

  React.useEffect(() => {
    setMounted(true)
    setCurrentDate(new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    }))
  }, [])

  React.useEffect(() => {
    if (mounted && config) {
      loadData()
    }
  }, [mounted, config, loadData])

  // Analytical Calculations based on MySQL Stats
  const lineChartData = React.useMemo(() => {
    if (!mysqlStats?.trend) return []
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    return months.map((month, index) => {
      const monthNum = index + 1
      const monthData = mysqlStats.trend.find((t: any) => t.month === monthNum)
      const total = monthData?.total || 0
      const notified = monthData?.notified || 0
      return {
        month,
        rate: total > 0 ? Math.round((notified / total) * 100) : 0
      }
    })
  }, [mysqlStats])

  const pieData = React.useMemo(() => {
    if (!mysqlStats?.categories) return []
    return mysqlStats.categories.map((c: any) => ({
      name: `${c.category}类 (${c.category === 'A' ? '危急' : '重要'})`,
      value: c.count,
      fill: c.category === 'A' ? "hsl(var(--destructive))" : "hsl(var(--primary))"
    }))
  }, [mysqlStats])

  if (!mounted) return (
    <div className="flex h-screen items-center justify-center">
      <Activity className="size-8 animate-spin text-primary opacity-20" />
    </div>
  )

  const summaryData = [
    { label: "今日新增", value: mysqlStats?.todayNew?.toString() || "0", icon: ShieldAlert, color: "text-primary" },
    { label: "待随访任务", value: mysqlStats?.pendingTasks?.toString() || "0", icon: AlertCircle, color: "text-destructive" },
    { label: "已登记患者", value: mysqlStats?.totalPatients?.toLocaleString() || "0", icon: Users, color: "text-blue-600" },
    { label: "全量完成率", value: `${mysqlStats?.completionRate || 0}%`, icon: FileCheck, color: "text-green-600" },
  ]

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">临床概览</h1>
          <p className="text-muted-foreground">欢迎回来，今天是 {currentDate}</p>
        </div>
        <div className="flex gap-3">
          <Card className="flex items-center px-4 py-2 border-primary/20 bg-primary/5">
            <Calendar className="size-4 mr-2 text-primary" />
            <span className="text-xs font-medium">业务库：MySQL 8.4 {config?.mysql?.host ? `(${config.mysql.host})` : '(未配置)'}</span>
          </Card>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Activity className="size-4 mr-2" />}
            同步最新数据
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Card key={i} className="h-28 animate-pulse bg-muted" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryData.map((item) => (
            <Card key={item.label} className="hover:shadow-lg transition-all border-none shadow-md bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <h3 className="text-3xl font-bold mt-1">{item.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted/50 ${item.color}`}>
                    <item.icon className="size-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  随访率年度趋势 ({selectedYear})
                </CardTitle>
                <CardDescription>计算自中心 MySQL 业务库实时记录</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineChartConfig} className="h-[300px] w-full">
              <LineChart data={lineChartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  unit="%"
                  domain={[0, 100]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="var(--color-rate)" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--color-rate)" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">异常分类分布</CardTitle>
            <CardDescription>MySQL 业务表 A/B 类占比</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <ChartContainer config={pieChartConfig} className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full px-4">
              {pieData.map((item: any) => (
                <div key={item.name} className="flex flex-col items-center p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold">{item.value} <span className="text-[10px] text-muted-foreground font-normal">例</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-primary/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle>待办事项与危急提醒</CardTitle>
            <CardDescription>来自中心库的待随访任务</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/follow-ups">查看全部</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {mysqlStats?.recentTasks?.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`size-2.5 rounded-full ${task.anomalyCategory === 'A' ? 'bg-destructive animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{task.patientName || "档案未补录"}</p>
                      <Badge variant={task.anomalyCategory === 'A' ? 'destructive' : 'secondary'} className="text-[10px] h-4">
                        {task.anomalyCategory}类
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">档案号：{task.patientProfileId} • 登记于：{task.checkupDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Button variant="link" size="sm" asChild className="p-0 h-auto font-bold text-xs">
                    <Link href={`/follow-ups/${task.id}/record`}>
                      录入随访
                      <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {(!mysqlStats?.recentTasks || mysqlStats.recentTasks.length === 0) && !isLoading && (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="size-8 opacity-20" />
                <p>暂无待处理的中心库异常记录</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
