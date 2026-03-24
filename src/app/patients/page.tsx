
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  UserPlus,
  Eye,
  Edit,
  MoreVertical,
  FileSpreadsheet
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
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

// Mock patients
const mockPatients = [
  { id: 'D1001', name: '张三', gender: '男', age: 45, phone: '13800138000', idNumber: '440101198001012345', org: '广州科技有限公司', status: '正常' },
  { id: 'D1002', name: '李四', gender: '女', age: 62, phone: '13912345678', idNumber: '440101196301012345', org: '白云区第一中学', status: '正常' },
  { id: 'D1003', name: '王五', gender: '男', age: 50, phone: '13500001111', idNumber: '440101197501012345', org: '退休', status: '死亡' },
  { id: 'D1004', name: '赵六', gender: '女', age: 38, phone: '13611112222', idNumber: '440101198701012345', org: '腾讯控股', status: '无法联系' },
]

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const { toast } = useToast()

  const handleDownloadTemplate = () => {
    toast({
      title: "正在下载模板",
      description: "档案批量导入模板.xlsx 已开始下载。",
    })
  }

  const handleImportExcel = () => {
    toast({
      title: "数据导入成功",
      description: "已成功从Excel导入 15 条档案记录。",
    })
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">档案中心</h1>
          <p className="text-muted-foreground">管理全院患者健康档案，支持批量导入与信息维护</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="size-4" />
            下载模版
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleImportExcel}>
            <Upload className="size-4" />
            批量导入
          </Button>
          <Button asChild className="gap-2">
            <Link href="/records/new">
              <UserPlus className="size-4" />
              新增档案
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="搜索姓名、档案编号、手机号、身份证号..." 
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

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px]">档案编号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>性别/年龄</TableHead>
              <TableHead>身份证号</TableHead>
              <TableHead>单位</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPatients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-muted/10 transition-colors">
                <TableCell className="font-bold text-primary">{patient.id}</TableCell>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.gender} / {patient.age}岁</TableCell>
                <TableCell className="font-mono text-xs">{patient.idNumber}</TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">{patient.org}</TableCell>
                <TableCell>
                  <Badge 
                    variant={patient.status === '正常' ? 'default' : patient.status === '死亡' ? 'destructive' : 'secondary'}
                    className="font-medium"
                  >
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild title="查看档案">
                      <Link href={`/patients/${patient.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Edit className="size-4" /> 修改资料
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Download className="size-4" /> 导出档案
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
