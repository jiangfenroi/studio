"use client"

import * as React from "react"
import { 
  FileSpreadsheet, 
  Table as TableIcon, 
  Search,
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

// 获取所有列 ID 的辅助函数
const ALL_COLUMN_IDS = Object.values(COLUMNS).flatMap(table => table.map(col => col.id));

export default function StatsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  // 默认选择所有列
  const [selectedCols, setSelectedCols] = React.useState<string[]>(ALL_COLUMN_IDS)
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
      toast({ variant: "destructive", title: "MySQL 连接失败" })
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
    setSelectedCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const filteredData = React.useMemo(() => {
    return mysqlData.filter(row => 
      Object.values(row).some(val => String(val || "").toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [mysqlData, searchTerm])

  const handleExport = () => {
    if (filteredData.length === 0) return
    const allColsList = [...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF]
    const headers = selectedCols.map(id => allColsList.find(c => c.id === id)?.label || id)
    const csvRows = filteredData.map(row => 
      selectedCols.map(col => `"${String(row[col] || "").replace(/"/g, '""')}"`).join(",")
    )
    const csvContent = "\ufeff" + [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `全字段临床统计导出_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: "全字段报表已导出" })
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">数据导出管理</h1>
          <p className="text-muted-foreground">基于中心 MySQL 业务库的实时统计（默认全选所有字段）</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCentralData} disabled={isSyncing} className="gap-2">
            {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            刷新中心数据
          </Button>
          <Button onClick={handleExport} className="gap-2 h-11 px-8 shadow-lg" disabled={filteredData.length === 0}>
            <FileSpreadsheet className="size-5" />
            导出报表
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-1 border-none shadow-md h-fit">
          <CardHeader className="bg-primary/5">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">字段筛选</CardTitle>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs"
                onClick={() => setSelectedCols(selectedCols.length === ALL_COLUMN_IDS.length ? [] : ALL_COLUMN_IDS)}
              >
                {selectedCols.length === ALL_COLUMN_IDS.length ? "取消全选" : "全选"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[500px] pr-4">
              {Object.entries(COLUMNS).map(([table, cols]) => (
                <div key={table} className="mb-6">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                    {table === 'SP_PERSON' ? '个人档案 (SP_PERSON)' : 
                     table === 'SP_YCJG' ? '异常结果 (SP_YCJG)' : 
                     '临床随访 (SP_SF)'}
                  </h3>
                  {cols.map(col => (
                    <div key={col.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox id={col.id} checked={selectedCols.includes(col.id)} onCheckedChange={() => toggleCol(col.id)} />
                      <label htmlFor={col.id} className="text-sm cursor-pointer hover:text-primary transition-colors">{col.label}</label>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-md overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><TableIcon className="size-5 text-primary" /> 实时业务预览</CardTitle>
              <Input placeholder="搜索预览内容..." className="w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    {selectedCols.map(colId => (
                      <TableHead key={colId} className="whitespace-nowrap font-bold">
                        {[...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF].find(c => c.id === colId)?.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row, idx) => (
                    <TableRow key={idx}>
                      {selectedCols.map(colId => (
                        <TableCell key={colId} className="text-xs truncate max-w-[150px]">
                          {colId === 'category' ? <Badge variant={row[colId] === 'A' ? 'destructive' : 'secondary'}>{row[colId]}</Badge> : 
                           (colId === 'isNotified' || colId === 'isHealthEducationProvided' || colId === 'isReExamined') ? (row[colId] ? '是' : '否') :
                           String(row[colId] || "-")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
