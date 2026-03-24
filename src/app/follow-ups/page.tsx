
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Calendar,
  User,
  Phone,
  ClipboardList,
  CheckCircle2,
  Clock,
  MoreVertical,
  ArrowRight
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Mock data for pending tasks
const pendingTasks = [
  { 
    id: '1', 
    archiveNo: 'D1001', 
    name: '张三', 
    gender: '男', 
    age: 45, 
    examDate: '2025-01-01', 
    phone: '13800138000', 
    details: '肺部结节 (8mm)，建议3个月复查CT。', 
    disposalAdvice: '建议前往呼吸内科门诊进一步咨询。',
    feedback: '家属表示已知情，近期会带患者检查。'
  },
  { 
    id: '2', 
    archiveNo: 'D1002', 
    name: '李四', 
    gender: '女', 
    age: 62, 
    examDate: '2024-12-25', 
    phone: '13912345678', 
    details: '糖耐量异常，空腹血糖 7.2mmol/L。', 
    disposalAdvice: '建议进行糖化血红蛋白检查。',
    feedback: '患者近期有口渴症状。'
  },
]

// Mock data for closed tasks
const closedTasks = [
  { 
    id: '101', 
    archiveNo: 'D1005', 
    name: '王五', 
    gender: '男', 
    age: 50, 
    examDate: '2024-11-20', 
    followUpDate: '2025-01-02',
    result: '患者已在省医完成手术，术后恢复良好。',
    nextDate: '2025-07-01'
  },
]

export default function FollowUpsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">随访管理</h1>
          <p className="text-muted-foreground">管理待随访任务与已结案记录，确保护理闭环</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索姓名、档案编号、手机号..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="gap-2 h-11">
          <Filter className="size-4" />
          高级筛选
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12">
          <TabsTrigger value="pending" className="flex gap-2 text-base">
            <Clock className="size-4" />
            待随访任务
            <Badge className="ml-1 bg-destructive">{pendingTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex gap-2 text-base">
            <CheckCircle2 className="size-4" />
            已结案任务
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {pendingTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.name}</h3>
                      <Badge variant="outline">{task.gender} / {task.age}岁</Badge>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">档案: {task.archiveNo}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-4" />
                        体检日期: <span className="text-foreground font-medium">{task.examDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-4" />
                        联系电话: <span className="text-foreground font-medium">{task.phone}</span>
                      </div>
                      <div className="col-span-full mt-2 pt-2 border-t">
                        <p className="font-semibold text-primary mb-1">重要异常结果详情:</p>
                        <p className="text-muted-foreground line-clamp-2">{task.details}</p>
                      </div>
                      <div className="col-span-full">
                        <p className="font-semibold text-amber-600 mb-1">处置意见:</p>
                        <p className="text-muted-foreground line-clamp-2">{task.disposalAdvice}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6">
                    <Button asChild className="gap-2">
                      <Link href={`/follow-ups/${task.id}/record`}>
                        录入随访
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="outline">查看档案</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingTasks.length === 0 && (
            <div className="py-20 text-center bg-muted/20 rounded-xl border-dashed border-2">
              <ClipboardList className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">目前没有待随访的任务</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6 space-y-4">
          {closedTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 bg-green-50/10">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{task.name}</h3>
                      <Badge variant="outline">{task.gender} / {task.age}岁</Badge>
                      <Badge className="bg-green-100 text-green-700">已结案</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-4" />
                        随访日期: <span className="text-foreground font-medium">{task.followUpDate}</span>
                      </div>
                      {task.nextDate && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="size-4" />
                          预定下次随访: <span className="text-primary font-bold">{task.nextDate}</span>
                        </div>
                      )}
                      <div className="col-span-full mt-2 pt-2 border-t">
                        <p className="font-semibold text-green-700 mb-1">回访结果:</p>
                        <p className="text-muted-foreground">{task.result}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row lg:flex-col gap-3 lg:border-l lg:pl-6">
                    <Button variant="outline" className="gap-2">
                      <ClipboardList className="size-4" />
                      查看详情
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
