"use client"

import * as React from "react"
import { 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Table as TableIcon, 
  CheckSquare, 
  Square,
  Search,
  ChevronRight,
  Database,
  Loader2
} from "lucide-react"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { fetchDataForStats } from "@/app/actions/mysql-sync"

// 对应中心 MySQL (SP_PERSON, SP_YCJG, SP_SF) 的完整字段设计
const COLUMNS = {
  SP_PERSON: [
    { id: "archiveNo", label: "档案编号" },
    { id: "name", label: "姓名" },
    { id: "gender", label: "性别" },
    { id: "age", label: "年龄" },
    { id: "idNumber", label: "身份证号" },
    { id: "organization", label: "单位" },
    { id: "phoneNumber", label: "电话" },
    { id: "patientStatus", label: "档案状态" },
  ],
  SP_YCJG: [
    { id: "examNo", label: "体检编号" },
    { id: "examDate", label: "体检日期" },
    { id: "category", label: "异常类别" },
    { id: "details", label: "异常详情" },
    { id: "disposalAdvice", label: "处置意见" },
    { id: "notificationDate", label: "通知日期" },
    { id: "notificationTime", label: "通知时间" },
    { id: "notifiedPerson", label: "被通知人" },
    { id: "notifier", label: "通知人" },
    { id: "isNotified", label: "是否已告知" },
    { id: "isHealthEducationProvided", label: "是否健康宣教" },
    { id: "notifiedPersonFeedback", label: "告知反馈" },
  ],
  SP_SF: [
    { id: "followUpDate", label: "随访日期" },
    { id: "followUpResult", label: "随访结果" },
    { id: "followUpPerson", label: "随访人" },
    { id: "isReExamined", label: "是否复查" },
  ]
}

export default function StatsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [selectedCols, setSelectedCols] = React.useState<string[]>(["archiveNo", "name", "examDate", "category", "notifiedPerson", "isNotified", "followUpResult"])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mysqlData, setMysqlData] = React.useState<any[]>([])
  const [isSyncing, setIsSyncing] = React.useState(false)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: systemConfig } = useDoc(configRef)

  const loadCentralData = React.useCallback(async () => {
    if (!systemConfig?.mysql) return
    setIsSyncing(true)
    try {
      const data = await fetchDataForStats(systemConfig.mysql)
      setMysqlData(data as any[])
    } catch (error) {
      toast({ variant: "destructive", title: "MySQL 连接失败", description: "无法从中心业务库获取实时数据。" })
    } finally {
      setIsSyncing(false)
    }
  }, [systemConfig, toast])

  React.useEffect(() => {
    if (systemConfig?.mysql) {
      loadCentralData()
    }
  }, [systemConfig, loadCentralData])

  const toggleCol = (id: string) => {
    setSelectedCols(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const filteredData = React.useMemo(() => {
    return mysqlData.filter(row => 
      Object.values(row).some(val => 
        String(val || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [mysqlData, searchTerm])

  const handleExport = () => {
    if (filteredData.length === 0) return

    const headers = selectedCols.map(id => {
      const found = [...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF].find(c => c.id === id)
      return found?.label || id
    })

    const csvRows = filteredData.map(row => 
      selectedCols.map(col => `"${String(row[col] || "").replace(/"/g, '""')}"`).join(",")
    )

    const csvContent = "\ufeff" + [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `中心库业务导出_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({ title: "报表导出成功", description: `已从中心库提取 ${filteredData.length} 条业务记录。` })
  }

  const allColumnsList = [...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF]

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">数据导出管理</h1>
          <p className="text-muted-foreground">基于中心 MySQL 业务库的实时统计与报表导出</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCentralData} disabled={isSyncing} className="gap-2">
            {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            刷新中心数据
          </Button>
          <Button onClick={handleExport} className="gap-2 h-11 px-8 shadow-lg" disabled={filteredData.length === 0}>
            <FileSpreadsheet className="size-5" />
            导出为 CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-1 border-none shadow-md h-fit">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="size-5 text-primary" />
              自定义导出设计
            </CardTitle>
            <CardDescription>勾选中心库字段 (MySQL 8.4)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {Object.entries(COLUMNS).map(([table, cols]) => (
                  <div key={table} className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      {table} 核心表
                    </h3>
                    <div className="grid gap-2 pl-2">
                      {cols.map(col => (
                        <div key={col.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={col.id} 
                            checked={selectedCols.includes(col.id)} 
                            onCheckedChange={() => toggleCol(col.id)}
                          />
                          <label htmlFor={col.id} className="text-sm cursor-pointer">{col.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TableIcon className="size-5 text-primary" />
                  实时业务预览
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="在预览中搜索..." 
                    className="pl-9 h-9" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border-t overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      {selectedCols.map(colId => (
                        <TableHead key={colId} className="whitespace-nowrap font-bold">
                          {allColumnsList.find(c => c.id === colId)?.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row, idx) => (
                        <TableRow key={idx}>
                          {selectedCols.map(colId => (
                            <TableCell key={`${idx}-${colId}`} className="text-xs max-w-[200px] truncate">
                              {colId === "category" ? (
                                <Badge variant={row[colId] === "A" ? "destructive" : "secondary"}>
                                  {row[colId]}类
                                </Badge>
                              ) : colId === "isNotified" || colId === "isHealthEducationProvided" || colId === "isReExamined" ? (
                                row[colId] ? "是" : "否"
                              ) : (
                                String(row[colId] || "-")
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={selectedCols.length} className="h-48 text-center text-muted-foreground">
                          {isSyncing ? "正在从中心库提取数据..." : "中心库暂无匹配记录"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
