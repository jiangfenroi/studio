
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Plus,
  FileText,
  Phone,
  User,
  Calendar,
  ClipboardList
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"

// Detailed mock data as per requirements
const mockRecords = [
  { 
    id: '1', 
    archiveNo: 'D1001', 
    name: '张三', 
    gender: '男',
    age: 45,
    phone: '13800138000',
    type: 'A', 
    examNo: '202501010001', 
    examDate: '2025-01-01', 
    status: '已通知',
    details: '右肺中叶胸膜下见实性结节影，直径约8mm，边缘毛糙。',
    disposalAdvice: '建议前往呼吸内科门诊进一步咨询，并在3个月后复查CT。',
    notifier: '李医生',
    feedback: '患者本人已知情，表示下周会去复查。'
  },
  { 
    id: '2', 
    archiveNo: 'D1002', 
    name: '李四', 
    gender: '女',
    age: 62,
    phone: '13912345678',
    type: 'B', 
    examNo: '202501010002', 
    examDate: '2025-01-01', 
    status: '待通知',
    details: '糖耐量异常，空腹血糖 7.2mmol/L，餐后两小时血糖 11.1mmol/L。',
    disposalAdvice: '建议进行糖化血红蛋白检查，并控制饮食。',
    notifier: '王护士',
    feedback: '暂无'
  },
  { 
    id: '3', 
    archiveNo: 'D1003', 
    name: '王五', 
    gender: '男',
    age: 50,
    phone: '13500001111',
    type: 'A', 
    examNo: '202501020001', 
    examDate: '2025-01-02', 
    status: '已通知',
    details: '心电图显示急性心肌梗死风险，ST段明显抬高。',
    disposalAdvice: '立即转诊急诊科，建议急诊介入手术。',
    notifier: '陈医生',
    feedback: '家属正带往急诊，救护车已出发。'
  },
  { 
    id: '4', 
    archiveNo: 'D1004', 
    name: '赵六', 
    gender: '女',
    age: 38,
    phone: '13611112222',
    type: 'B', 
    examNo: '202501020002', 
    examDate: '2025-01-02', 
    status: '已通知',
    details: '甲状腺结节 (TI-RADS 4a类)，建议穿刺活检。',
    disposalAdvice: '建议甲状腺外科门诊进一步评估。',
    notifier: '张医生',
    feedback: '患者比较焦虑，已约下周一门诊。'
  },
  { 
    id: '5', 
    archiveNo: 'D1005', 
    name: '钱七', 
    gender: '男',
    age: 55,
    phone: '13788889999',
    type: 'A', 
    examNo: '202501030001', 
    examDate: '2025-01-03', 
    status: '待通知',
    details: '腹部彩超见肝脏巨大占位性病变，性质待查。',
    disposalAdvice: '建议进一步做增强CT或MRI检查。',
    notifier: '管理员',
    feedback: '正在联系中'
  },
]

export default function RecordsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedRecord, setSelectedRecord] = React.useState<typeof mockRecords[0] | null>(null)

  const filteredRecords = mockRecords.filter(r => 
    r.name.includes(searchTerm) || 
    r.archiveNo.includes(searchTerm) || 
    r.examNo.includes(searchTerm)
  )

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">结果管理</h1>
          <p className="text-muted-foreground">综合展示并维护所有重要异常结果登记详情</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            导出详细记录
          </Button>
          <Button asChild className="gap-2">
            <Link href="/records/new">
              <Plus className="size-4" />
              新增结果登记
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索档案编号、体检编号、姓名..." 
            className="pl-10 h-11" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="gap-2 h-11 px-6">
          <Filter className="size-4" />
          高级筛选
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold whitespace-nowrap">体检日期</TableHead>
              <TableHead className="font-bold">档案/姓名</TableHead>
              <TableHead className="font-bold">性别/年龄</TableHead>
              <TableHead className="font-bold">联系电话</TableHead>
              <TableHead className="font-bold">类别</TableHead>
              <TableHead className="font-bold">异常详情 (摘要)</TableHead>
              <TableHead className="font-bold">通知人</TableHead>
              <TableHead className="font-bold text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} className="hover:bg-muted/10 transition-colors group">
                <TableCell className="font-medium whitespace-nowrap">{record.examDate}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-primary">{record.name}</span>
                    <span className="text-[10px] text-muted-foreground">ID: {record.archiveNo}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{record.gender} / {record.age}岁</TableCell>
                <TableCell className="text-sm font-mono">{record.phone}</TableCell>
                <TableCell>
                  <Badge variant={record.type === 'A' ? 'destructive' : 'secondary'} className="font-bold px-3">
                    {record.type}类
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-xs text-muted-foreground" title={record.details}>
                    {record.details}
                  </p>
                </TableCell>
                <TableCell className="text-sm font-medium">{record.notifier}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setSelectedRecord(record)}>
                      <Eye className="size-4 text-primary" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="gap-2" onClick={() => setSelectedRecord(record)}>
                          <ClipboardList className="size-4" /> 查看完整详情
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="size-4" /> 修改登记信息
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-primary">
                          <FileText className="size-4" /> 查看体检报告
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <Trash2 className="size-4" /> 删除该记录
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredRecords.length === 0 && (
          <div className="py-24 text-center">
            <div className="size-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="size-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">未找到匹配的重要异常结果记录</p>
          </div>
        )}
      </div>

      {/* Record Details Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Badge variant={selectedRecord?.type === 'A' ? 'destructive' : 'secondary'} className="text-sm">
                {selectedRecord?.type}类异常
              </Badge>
              重要异常结果详情
            </DialogTitle>
            <DialogDescription>
              体检编号: <span className="font-mono font-bold text-foreground">{selectedRecord?.examNo}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <User className="size-4 text-primary" />
                  <span className="font-bold text-lg">{selectedRecord?.name}</span>
                  <Badge variant="outline">{selectedRecord?.gender} / {selectedRecord?.age}岁</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="size-4" />
                  <span>{selectedRecord?.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>体检日期: {selectedRecord?.examDate}</span>
                </div>
                <div className="text-[10px] text-muted-foreground bg-white/50 px-2 py-1 rounded inline-block">
                  档案编号: {selectedRecord?.archiveNo}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-primary">通知情况</p>
                <div className="p-3 border rounded-md bg-white space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">通知人:</span>
                    <span className="font-medium">{selectedRecord?.notifier}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">状态:</span>
                    <Badge variant="outline" className="h-5 px-1 bg-green-50 text-green-700 border-green-200">
                      {selectedRecord?.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-destructive flex items-center gap-2">
                  <ClipboardList className="size-4" />
                  异常结果详情
                </p>
                <ScrollArea className="h-[100px] p-3 border rounded-md bg-white text-sm leading-relaxed">
                  {selectedRecord?.details}
                </ScrollArea>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-600">处置意见</p>
                <ScrollArea className="h-[100px] p-3 border rounded-md bg-amber-50/10 text-sm leading-relaxed">
                  {selectedRecord?.disposalAdvice}
                </ScrollArea>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-primary">反馈结果</p>
                <div className="p-3 border rounded-md bg-blue-50/10 text-sm italic text-muted-foreground">
                  “{selectedRecord?.feedback}”
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>关闭窗口</Button>
            <Button className="gap-2">
              <FileText className="size-4" />
              查看完整报告 (PDF)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
