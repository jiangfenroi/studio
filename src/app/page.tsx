
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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, collectionGroup, query, doc } from "firebase/firestore"
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
  const [currentDate, setCurrentDate] = React.useState("")
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear().toString())

  // Real-time data fetching
  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients } = useCollection(patientsQuery)

  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: records, isLoading } = useCollection(recordsQuery)

  const configRef = useMemoFirebase(() => doc(db, 'systemConfig', 'default'), [db])
  const { data: config } = useDoc(configRef)

  React.useEffect(() => {
    setMounted(true)
    setCurrentDate(new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    }))
  }, [])

  // Analytical Calculations
  const stats = React.useMemo(() => {
    if (!records) return { today: 0, pending: 0, totalPatients: 0, completionRate: 0 }
    
    const todayStr = new Date().toISOString().split('T')[0]
    return {
      today: records.filter(r => r.examDate === todayStr).length,
      pending: records.filter(r => !r.isNotified).length,
      totalPatients: patients?.length || 0,
      completionRate: records.length > 0 
        ? Math.round((records.filter(r => r.isNotified).length / records.length) * 100) 
        : 0
    }
  }, [records, patients])

  const lineChartData = React.useMemo(() => {
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    return months.map((month, index) => {
      const monthNum = (index + 1).toString().padStart(2, '0')
      
      const monthlyRecords = (records || []).filter(r => {
        const date = r.noticeDate || r.examDate 
        return date && date.startsWith(`${selectedYear}-${monthNum}`)
      })

      const closed = monthlyRecords.filter(r => r.isNotified).length
      const total = monthlyRecords.length

      return {
        month,
        rate: total > 0 ? Math.round((closed / total) * 100) : 0
      }
    })
  }, [records, selectedYear])

  const pieData = React.useMemo(() => {
    if (!records) return []
    const aCount = records.filter(r => r.category === 'A').length
    const bCount = records.filter(r => r.category === 'B').length
    return [
      { name: "A类 (危急)", value: aCount, fill: "hsl(var(--destructive))" },
      { name: "B类 (重要)", value: bCount, fill: "hsl(var(--primary))" },
    ]
  }, [records])

  const recentTasks = React.useMemo(() => {
    return (records || [])
      .filter(r => !r.isNotified)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
  }, [records])

  if (!mounted) return null

  const summaryData = [
    { label: "今日新增", value: stats.today.toString(), icon: ShieldAlert, color: "text-primary" },
    { label: "待随访任务", value: stats.pending.toString(), icon: AlertCircle, color: "text-destructive" },
    { label: "已登记患者", value: stats.totalPatients.toLocaleString(), icon: Users, color: "text-blue-600" },
    { label: "全量完成率", value: `${stats.completionRate}%`, icon: FileCheck, color: "text-green-600" },
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
            <span className="text-xs font-medium">业务库：MySQL 8.4 {config?.mysql?.host ? `(${config.mysql.host})` : '(未连接)'}</span>
          </Card>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-10">
              <SelectValue placeholder="选择年份" />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map(i => {
                const year = (new Date().getFullYear() - i).toString()
                return <SelectItem key={year} value={year}>{year}年</SelectItem>
              })}
            </SelectContent>
          </Select>
        </div>
      </header>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  随访率年度趋势 ({selectedYear})
                </CardTitle>
                <CardDescription>计算公式：(当月已随访数 / 当月通知总人数) × 100%</CardDescription>
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
            <CardDescription>A类 (危急) 与 B类 (重要) 占比</CardDescription>
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
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full px-4">
              {pieData.map((item) => (
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
            <CardDescription>按登记时间倒序排列的待随访任务</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/follow-ups">查看全部</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`size-2.5 rounded-full ${task.category === 'A' ? 'bg-destructive animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{task.notifiedPerson}</p>
                      <Badge variant={task.category === 'A' ? 'destructive' : 'secondary'} className="text-[10px] h-4">
                        {task.category}类
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">档案号：{task.archiveNo} • 登记于：{task.noticeDate || task.examDate}</p>
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
            {recentTasks.length === 0 && !isLoading && (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="size-8 opacity-20" />
                <p>暂无待通知的异常任务</p>
              </div>
            )}
            {isLoading && (
              <div className="py-16 text-center text-muted-foreground animate-pulse">
                正在统计数据...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
