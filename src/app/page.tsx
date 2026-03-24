
"use client"

import * as React from "react"
import { 
  ShieldAlert, 
  Users, 
  FileCheck, 
  TrendingUp,
  AlertCircle,
  Calendar,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart } from "recharts"
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, collectionGroup, query, doc } from "firebase/firestore"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const chartData = [
  { month: "1月", A: 45, B: 80 },
  { month: "2月", A: 52, B: 75 },
  { month: "3月", A: 48, B: 90 },
  { month: "4月", A: 61, B: 85 },
  { month: "5月", A: 55, B: 105 },
  { month: "6月", A: 67, B: 95 },
]

const pieData = [
  { name: "A类 (危急)", value: 35, fill: "hsl(var(--destructive))" },
  { name: "B类 (重要)", value: 65, fill: "hsl(var(--primary))" },
]

const chartConfig = {
  A: {
    label: "A类异常",
    color: "hsl(var(--destructive))",
  },
  B: {
    label: "B类异常",
    color: "hsl(var(--primary))",
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

  // Real-time data fetching
  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients } = useCollection(patientsQuery)

  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: records } = useCollection(recordsQuery)

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

  if (!mounted) return null

  const stats = {
    today: (records || []).filter(r => r.examDate === new Date().toISOString().split('T')[0]).length,
    pending: (records || []).filter(r => !r.isNotified).length,
    totalPatients: (patients || []).length,
    completionRate: "94%"
  }

  const recentTasks = (records || [])
    .filter(r => !r.isNotified)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  const summaryData = [
    { label: "今日新增", value: stats.today.toString(), icon: ShieldAlert, color: "text-primary" },
    { label: "待通知", value: stats.pending.toString(), icon: AlertCircle, color: "text-destructive" },
    { label: "已登记患者", value: stats.totalPatients.toLocaleString(), icon: Users, color: "text-blue-600" },
    { label: "本月完成率", value: stats.completionRate, icon: FileCheck, color: "text-green-600" },
  ]

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">系统概览</h1>
          <p className="text-muted-foreground">欢迎回来，今天是 {currentDate}</p>
        </div>
        <div className="flex gap-2">
          <Card className="flex items-center px-4 py-2 border-primary/20 bg-primary/5">
            <Calendar className="size-4 mr-2 text-primary" />
            <span className="text-sm font-medium">数据库：MySQL 8.4 {config?.mysql?.host ? `(${config.mysql.host})` : '(未配置)'}</span>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryData.map((item) => (
          <Card key={item.label} className="hover:shadow-lg transition-shadow border-none shadow-md bg-white">
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
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              异常结果趋势
            </CardTitle>
            <CardDescription>展示A类与B类异常结果的数量变化情况</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="A" fill="var(--color-A)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" fill="var(--color-B)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">异常分类占比</CardTitle>
            <CardDescription>全量数据分类分布</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="h-[250px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
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
              </ChartContainer>
              <div className="flex flex-col gap-2 mt-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-destructive" />
                  <span>A类 (危急结果)：35%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-primary" />
                  <span>B类 (重要异常)：65%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-primary/5">
          <CardTitle>待办事项与提醒</CardTitle>
          <CardDescription>需要优先处理的通知任务</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`size-2 rounded-full ${task.category === 'A' ? 'bg-destructive animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <p className="font-semibold">{task.notifiedPerson} - {task.category}类</p>
                    <p className="text-xs text-muted-foreground">体检号：{task.examNo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">登记日期: {task.examDate}</p>
                  <Button variant="link" size="sm" asChild className="p-0 h-auto font-bold">
                    <Link href={`/records?search=${task.archiveNo}`}>
                      立即查看处理
                      <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {recentTasks.length === 0 && (
              <div className="py-10 text-center text-muted-foreground">
                暂无待通知的异常任务
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
