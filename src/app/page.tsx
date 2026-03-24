
"use client"

import * as React from "react"
import { 
  ShieldAlert, 
  Users, 
  FileCheck, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell, Pie, PieChart } from "recharts"

const summaryData = [
  { label: "今日新增", value: "12", icon: ShieldAlert, color: "text-primary" },
  { label: "待通知", value: "3", icon: AlertCircle, color: "text-destructive" },
  { label: "已登记患者", value: "1,248", icon: Users, color: "text-blue-600" },
  { label: "本月完成率", value: "94%", icon: FileCheck, color: "text-green-600" },
]

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
}

export default function Home() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">系统概览</h1>
          <p className="text-muted-foreground">欢迎回来，今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          <Card className="flex items-center px-4 py-2 border-primary/20 bg-primary/5">
            <Calendar className="size-4 mr-2 text-primary" />
            <span className="text-sm font-medium">离线数据库：连接正常 (MySQL 8.4)</span>
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
              最近半年异常结果趋势
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
            <CardDescription>当前数据库中AB类比例分布</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="h-[250px] w-full">
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
            {[
              { id: '1', name: '李晓明', type: 'A类', examNo: '202501020001', time: '10分钟前' },
              { id: '2', name: '王爱华', type: 'B类', examNo: '202501020002', time: '35分钟前' },
              { id: '3', name: '张建国', type: 'A类', examNo: '202501020003', time: '1小时前' },
            ].map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`size-2 rounded-full ${task.type === 'A' ? 'bg-destructive animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <p className="font-semibold">{task.name} - {task.type}</p>
                    <p className="text-xs text-muted-foreground">体检号：{task.examNo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{task.time}</p>
                  <button className="text-xs text-primary font-bold mt-1">立即登记通知</button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
