"use client"

import * as React from "react"
import { 
  FileSpreadsheet, 
  Table as TableIcon, 
  Search,
  Database,
  Loader2,
  CheckCircle2,
  Filter
} from "lucide-react"
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

// 统计报表全量字段映射 (对应 SP_PERSON, SP_YCJG, SP_SF)
const COLUMNS = {
  SP_PERSON: [
    { id: "archiveNo", label: "档案编号" },
    { id: "name", label: "姓名" },
    { id: "gender", label: "性别" },
    { id: "age", label: "年龄" },
    { id: "phoneNumber", label: "电话" },
    { id: "idNumber", label: "身份证号ID" },
    { id: "address", label: "家庭住址" },
    { id: "organization", label: "工作单位" },
    { id: "patientStatus", label: "状态" },
  ],
  SP_YCJG: [
    { id: "checkupNumber", label: "体检编号" },
    { id: "checkupDate", label: "体检日期" },
    { id: "anomalyCategory", label: "异常种类" },
    { id: "anomalyDetails", label: "异常详情" },
    { id: "notifier", label: "通知人" },
    { id: "notifiedPerson", label: "被通知人" },
    { id: "notificationDate", label: "通知日期" },
    { id: "notificationTime", label: "通知时间" },
    { id: "disposalSuggestions", label: "处置意见" },
    { id: "notifiedPersonFeedback", label: "被通知人反馈" },
    { id: "isHealthEducationProvided", label: "是否健康宣教" },
    { id: "isNotified", label: "是否通知" },
    { id: "isFollowUpRequired", label: "是否后续随访" },
  ],
  SP_SF: [
    { id: "followUpResult", label: "回访结果" },
    { id: "followUpPerson", label: "回访人" },
    { id: "followUpDate", label: "回访日期" },
    { id: "followUpTime", label: "回访时间" },
    { id: "isReExamined", label: "是否复查/病历检查" },
  ]
}

const ALL_IDS = Object.values(COLUMNS).flatMap(t => t.map(c => c.id));

export default function StatsPage() {
  const { toast } = useToast()
  const [selectedCols, setSelectedCols] = React.useState<string[]>(ALL_IDS)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mysqlData, setMysqlData] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const config = JSON.parse(sessionStorage.getItem('mysql_config') || '{}')
      if (!config.host) throw new Error('数据库连接未配置')
      const data = await fetchDataForStats(config)
      setMysqlData(data)
    } catch (err: any) {
      toast({ variant: "destructive", title: "数据检索失败", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const filteredData = React.useMemo(() => {
    return mysqlData.filter(row => 
      Object.values(row).some(val => String(val || "").toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [mysqlData, searchTerm])

  const handleExport = () => {
    if (filteredData.length === 0) return
    
    const allColsList = [...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF]
    const activeHeaders = allColsList.filter(c => selectedCols.includes(c.id))
    
    // 生成 CSV 内容
    const headers = activeHeaders.map(h => h.label).join(",")
    const csvRows = filteredData.map(row => 
      activeHeaders.map(h => {
        let val = row[h.id]
        if (val === undefined || val === null) return '""'
        if (typeof val === 'boolean' || (typeof val === 'number' && (h.id.startsWith('is') || h.id === 'isFollowUpRequired'))) {
          return val ? '"是"' : '"否"'
        }
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(",")
    )

    // 添加 BOM 头 (UTF-8) 以防 Excel 打开乱码
    const csvContent = "\ufeff" + [headers, ...csvRows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `临床重要异常全量导出_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast({ title: "报表生成完毕", description: `成功导出 ${filteredData.length} 条复合业务记录。` })
  }

  const toggleColumn = (id: string) => {
    setSelectedCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">全量业务导出管理</h1>
          <p className="text-muted-foreground font-medium">MySQL 核心链路：支持三表实时关联大宽表预览与自定义导出</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            同步刷新
          </Button>
          <Button onClick={handleExport} className="gap-2 h-11 px-8 shadow-lg bg-green-600 hover:bg-green-700" disabled={filteredData.length === 0}>
            <FileSpreadsheet className="size-5" /> 导出自定义数据表
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-1 border-none shadow-md h-fit">
          <CardHeader className="bg-primary/5 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Filter className="size-4" /> 自定义列选择</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setSelectedCols(ALL_IDS)}>全选</Button>
              <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setSelectedCols([])}>清空</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ScrollArea className="h-[600px] pr-4">
              {Object.entries(COLUMNS).map(([table, cols]) => (
                <div key={table} className="mb-8">
                  <h3 className="text-[10px] font-black text-primary/60 uppercase mb-3 tracking-widest border-b pb-1">
                    {table === 'SP_PERSON' ? '个人档案字段' : table === 'SP_YCJG' ? '重要异常记录' : '随访结果记录'}
                  </h3>
                  <div className="space-y-3">
                    {cols.map(col => (
                      <div key={col.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`col-${col.id}`} 
                          checked={selectedCols.includes(col.id)} 
                          onCheckedChange={() => toggleColumn(col.id)} 
                        />
                        <label htmlFor={`col-${col.id}`} className="text-sm cursor-pointer hover:text-primary transition-colors">
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-md overflow-hidden flex flex-col min-h-[700px]">
          <div className="p-4 border-b flex justify-between items-center bg-muted/20">
            <div className="flex items-center gap-4">
              <h3 className="font-bold flex items-center gap-2 text-primary"><TableIcon className="size-4" /> 导出预览 ({filteredData.length} 条)</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input placeholder="检索预览内容..." className="w-64 h-8 pl-8 text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">当前已选 {selectedCols.length} 个维度</p>
          </div>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[650px]">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    {selectedCols.map(id => (
                      <TableHead key={id} className="whitespace-nowrap font-bold text-xs py-3">
                        {[...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF].find(c => c.id === id)?.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={selectedCols.length} className="text-center py-20"><Loader2 className="animate-spin mx-auto mb-2" /> 正在进行三表实时数据联查...</TableCell></TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow><TableCell colSpan={selectedCols.length} className="text-center py-20 text-muted-foreground">未检索到任何符合条件的临床记录</TableCell></TableRow>
                  ) : filteredData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/5 group transition-colors">
                      {selectedCols.map(id => (
                        <TableCell key={id} className="text-[10px] max-w-[200px] truncate border-r last:border-0">
                          {typeof row[id] === 'boolean' || (typeof row[id] === 'number' && (id.startsWith('is') || id === 'isFollowUpRequired')) ? (
                            row[id] ? <CheckCircle2 className="size-3 text-green-500" /> : "-"
                          ) : (
                            String(row[id] || "-")
                          )}
                        </TableCell>
                      ))}
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