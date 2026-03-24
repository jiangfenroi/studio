
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
  FileText
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
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Mock data
const mockRecords = [
  { id: '1', archiveNo: 'D1001', name: '张三', type: 'A', examNo: '202501010001', examDate: '2025-01-01', status: '已通知', date: '2025-01-01' },
  { id: '2', archiveNo: 'D1002', name: '李四', type: 'B', examNo: '202501010002', examDate: '2025-01-01', status: '待通知', date: '2025-01-02' },
  { id: '3', archiveNo: 'D1003', name: '王五', type: 'A', examNo: '202501020001', examDate: '2025-01-02', status: '已通知', date: '2025-01-02' },
  { id: '4', archiveNo: 'D1004', name: '赵六', type: 'B', examNo: '202501020002', examDate: '2025-01-02', status: '已通知', date: '2025-01-03' },
  { id: '5', archiveNo: 'D1005', name: '钱七', type: 'A', examNo: '202501030001', examDate: '2025-01-03', status: '待通知', date: '2025-01-03' },
]

export default function RecordsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">结果管理</h1>
          <p className="text-muted-foreground">查看并管理系统中所有的重要异常结果记录</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            导出表格
          </Button>
          <Button asChild className="gap-2">
            <Link href="/records/new">
              <Plus className="size-4" />
              新增登记
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索档案编号、体检编号、姓名..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <Filter className="size-4" />
          筛选条件
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px]">档案编号</TableHead>
              <TableHead>体检编号</TableHead>
              <TableHead>患者姓名</TableHead>
              <TableHead>异常类别</TableHead>
              <TableHead>体检日期</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockRecords.map((record) => (
              <TableRow key={record.id} className="hover:bg-muted/10 transition-colors">
                <TableCell className="font-medium">{record.archiveNo}</TableCell>
                <TableCell>{record.examNo}</TableCell>
                <TableCell>{record.name}</TableCell>
                <TableCell>
                  <Badge variant={record.type === 'A' ? 'destructive' : 'secondary'} className="font-bold">
                    {record.type}类
                  </Badge>
                </TableCell>
                <TableCell>{record.examDate}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === '已通知' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {record.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Eye className="size-4" /> 查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <Edit className="size-4" /> 编辑修改
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-primary font-medium">
                        <FileText className="size-4" /> 体检报告
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="size-4" /> 删除记录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {mockRecords.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            暂无相关记录
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>显示 1 到 {mockRecords.length} 条，共 {mockRecords.length} 条记录</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>上一页</Button>
          <Button variant="outline" size="sm" className="bg-primary text-white hover:bg-primary/90">1</Button>
          <Button variant="outline" size="sm">下一页</Button>
        </div>
      </div>
    </div>
  )
}
