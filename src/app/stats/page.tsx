
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
  Database
} from "lucide-react"
import { useCollection, useMemoFirebase, useFirestore } from "@/firebase"
import { collection, collectionGroup, query } from "firebase/firestore"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

// Column Definitions for Custom Design
const COLUMNS = {
  SP_PERSON: [
    { id: "archiveNo", label: "档案编号" },
    { id: "name", label: "姓名" },
    { id: "gender", label: "性别" },
    { id: "age", label: "年龄" },
    { id: "idNumber", label: "身份证号" },
    { id: "organization", label: "单位" },
    { id: "phoneNumber", label: "电话" },
    { id: "status", label: "状态" },
  ],
  SP_YCJG: [
    { id: "examNo", label: "体检编号" },
    { id: "examDate", label: "体检日期" },
    { id: "category", label: "异常类别" },
    { id: "details", label: "异常详情" },
    { id: "disposalAdvice", label: "处置意见" },
    { id: "notifier", label: "通知人" },
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
  const [selectedCols, setSelectedCols] = React.useState<string[]>(["archiveNo", "name", "examDate", "category", "followUpResult"])
  const [searchTerm, setSearchTerm] = React.useState("")

  // Fetch all patients (SP_PERSON)
  const patientsQuery = useMemoFirebase(() => collection(db, "patientProfiles"), [db])
  const { data: patients, isLoading: patientsLoading } = useCollection(patientsQuery)

  // Fetch all anomaly and follow-up records across all patients (SP_YCJG & SP_SF)
  // We use collectionGroup to get all medicalAnomalyRecords across all subcollections
  const recordsQuery = useMemoFirebase(() => query(collectionGroup(db, "medicalAnomalyRecords")), [db])
  const { data: allRecords, isLoading: recordsLoading } = useCollection(recordsQuery)

  const toggleCol = (id: string) => {
    setSelectedCols(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  // Synthesize and Join Data
  const joinedData = React.useMemo(() => {
    if (!patients || !allRecords) return []

    // Map anomaly records and follow-ups to patients
    // Flattening logic: one row per anomaly/follow-up event
    return allRecords.map(record => {
      const patient = patients.find(p => p.id === record.patientProfileId)
      return {
        ...patient,
        ...record,
        // Ensure shared keys don't overwrite if needed, but here patientId/archiveNo are primary
        archiveNo: patient?.id || record.patientProfileId
      }
    })
  }, [patients, allRecords])

  const filteredData = joinedData.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const handleExport = () => {
    if (filteredData.length === 0) return

    // Create CSV content
    const headers = selectedCols.map(id => {
      const found = [...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF].find(c => c.id === id)
      return found?.label || id
    })

    const csvRows = filteredData.map(row => 
      selectedCols.map(col => `"${String(row[col as keyof typeof row] || "").replace(/"/g, '""')}"`).join(",")
    )

    const csvContent = "\ufeff" + [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `医疗数据导出_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "数据导出成功",
      description: `已根据自定义设计导出 ${filteredData.length} 条记录。`,
    })
  }

  const allColumnsList = [...COLUMNS.SP_PERSON, ...COLUMNS.SP_YCJG, ...COLUMNS.SP_SF]

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">数据导出管理</h1>
          <p className="text-muted-foreground">自定义设计导出报表，整合档案、异常与随访信息</p>
        </div>
        <Button onClick={handleExport} className="gap-2 h-11 px-8 shadow-lg" disabled={filteredData.length === 0}>
          <FileSpreadsheet className="size-5" />
          导出为 Excel
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Column Designer */}
        <Card className="lg:col-span-1 border-none shadow-md h-fit">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="size-5 text-primary" />
              自定义导出设计
            </CardTitle>
            <CardDescription>勾选需要导出的字段</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {Object.entries(COLUMNS).map(([table, cols]) => (
                  <div key={table} className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-primary" />
                      {table === "SP_PERSON" ? "档案信息 (SP_PERSON)" : table === "SP_YCJG" ? "异常结果 (SP_YCJG)" : "随访记录 (SP_SF)"}
                    </h3>
                    <div className="grid gap-2 pl-2">
                      {cols.map(col => (
                        <div key={col.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={col.id} 
                            checked={selectedCols.includes(col.id)} 
                            onCheckedChange={() => toggleCol(col.id)}
                          />
                          <label 
                            htmlFor={col.id} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {col.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Data Preview */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TableIcon className="size-5 text-primary" />
                  数据预览
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
              <div className="rounded-md border-t">
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
                                <Badge variant={row[colId] === "A" ? "destructive" : "secondary"} className="text-[10px] px-1 py-0">
                                  {row[colId]}类
                                </Badge>
                              ) : colId === "isReExamined" ? (
                                row[colId] ? "是" : "否"
                              ) : (
                                String(row[colId as keyof typeof row] || "-")
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={selectedCols.length} className="h-48 text-center text-muted-foreground">
                          {patientsLoading || recordsLoading ? "正在合成内网数据..." : "未找到匹配数据"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
            <div className="p-2 bg-primary/10 rounded-full">
              <CheckSquare className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">导出统计</p>
              <p className="text-xs text-muted-foreground">
                当前预览共 <span className="text-primary font-bold">{filteredData.length}</span> 条记录，包含 <span className="text-primary font-bold">{selectedCols.length}</span> 个自定义设计字段。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
