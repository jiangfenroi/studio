
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
    { id: "isNotified", label: "是否已告知" },
    { id: "notifiedPersonFeedback", label: "告知反馈" },
  ],
  SP_SF: [
    { id: "followUpDate", label: "随访日期" },
    { id: "followUpResult", label: "随访结果" },
    { id: "followUpPerson", label: "随访人" },
    { id: "isReExamined", label: "是否复查" },
  ]
}

const ALL_IDS = Object.values(COLUMNS).flatMap(t => t.map(c => c.id));

export default function StatsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [selectedCols, setSelectedCols] = React.useState<string[]>(ALL_IDS)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mysqlData, setMysqlData] = React.useState<any[]>([])
  const [isSyncing, setIsSyncing] = React.useState(false)

  const configRef = useMemoFirebase(() => doc(db, "systemConfig", "default"), [db])
  const { data: config } = useDoc(configRef)

  const loadData = React.useCallback(async () => {
    if (!config?.mysql) return
    setIsSyncing(true)
    try {
      const data = await fetchDataForStats(config.mysql)
      setMysqlData(data)
    } finally {
      setIsSyncing(false)
    }
  }, [config])

  React.useEffect(() => {
    if (config) loadData()
  }, [config, loadData])

  const filteredData = React.useMemo(() => {
    return mysqlData.filter(row => 
      Object.values(row).some(val => String(val || "").toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [mysqlData, searchTerm])

  const handleExport = () => {
    if (filteredData.length === 0) return
    const allColsList = [...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF]
    const headers = selectedCols.map(id => allColsList.find(c => c.id === id)?.label || id)
    const csvContent = "\ufeff" + [headers.join(","), ...filteredData.map(row => selectedCols.map(col => `"${String(row[col] || "-").replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `全量统计_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">数据导出管理</h1>
          <p className="text-muted-foreground">基于三表关联的大宽表实时统计预览</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isSyncing} className="gap-2">
            {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            刷新同步
          </Button>
          <Button onClick={handleExport} className="gap-2 h-11 px-8 shadow-lg" disabled={filteredData.length === 0}>
            <FileSpreadsheet className="size-5" /> 导出 CSV 报表
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-8">
        <Card className="col-span-1 border-none shadow-md h-fit">
          <CardHeader className="bg-primary/5 py-3">
            <CardTitle className="text-sm">字段多选 (默认全选)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ScrollArea className="h-[500px] pr-4">
              {Object.entries(COLUMNS).map(([table, cols]) => (
                <div key={table} className="mb-6">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">{table}</h3>
                  {cols.map(col => (
                    <div key={col.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox id={col.id} checked={selectedCols.includes(col.id)} onCheckedChange={() => setSelectedCols(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])} />
                      <label htmlFor={col.id} className="text-sm cursor-pointer">{col.label}</label>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-none shadow-md overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><TableIcon className="size-4" /> 实时业务预览 ({filteredData.length} 条)</h3>
            <Input placeholder="搜索..." className="w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0">
                  <TableRow>
                    {selectedCols.map(id => (
                      <TableHead key={id} className="whitespace-nowrap font-bold text-xs">
                        {[...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF].find(c => c.id === id)?.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row, idx) => (
                    <TableRow key={idx}>
                      {selectedCols.map(id => <TableCell key={id} className="text-[10px] max-w-[150px] truncate">{String(row[id] || "-")}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
