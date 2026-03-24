
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  ShieldAlert, 
  History, 
  FileText,
  User,
  Building,
  MapPin,
  Phone,
  BadgeCheck,
  Activity,
  ChevronRight,
  Download,
  AlertTriangle,
  ClipboardCheck,
  Stethoscope
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const id = params.id as string

  // Mock patient detailed data
  const patient = {
    id: id,
    name: '张三',
    gender: '男',
    age: 45,
    idNumber: '440101198001012345',
    phone: '13800138000',
    org: '广州航天云网科技有限公司',
    address: '广东省广州市天河区高普路102号2楼',
    status: '正常',
    lastExam: '2025-01-01'
  }

  // Unified clinical timeline
  const clinicalTimeline = [
    { 
      type: 'abnormal', 
      date: '2025-01-01', 
      title: '肺部结节 (8mm) - A类', 
      description: '右肺中叶胸膜下见实性结节影，直径约8mm。',
      tags: ['A类', '危急'],
      files: [
        { name: '20250101_体检总报告.pdf', category: '体检报告' },
        { name: '20250101_胸部CT影像.pdf', category: '影像检查报告' }
      ]
    },
    { 
      type: 'followup', 
      date: '2025-01-08', 
      title: '第1次随访 (告知义务)', 
      description: '已电话通知患者本人及其家属。家属表示已知情，近期会带患者前往三甲医院呼吸内科复查。',
      tags: ['已通知', '宣教完成'],
    },
    { 
      type: 'followup', 
      date: '2025-02-15', 
      title: '第2次随访 (复查反馈)', 
      description: '患者反馈已在省人民医院完成复查。结节稳定，医生建议半年后复查CT。',
      tags: ['复查完成'],
      files: [
        { name: '20250212_省医病理检查.pdf', category: '病理检查报告' }
      ]
    },
    { 
      type: 'abnormal', 
      date: '2024-05-12', 
      title: '空腹血糖 7.2mmol/L - B类', 
      description: '既往体检发现血糖异常。建议日常饮食控制。',
      tags: ['B类'],
    }
  ]

  const handleOpenPACS = () => {
    // Logic as per requirement: http://172.16.201.61:7242/?ChtId=档案编号
    const pacsUrl = `http://172.16.201.61:7242/?ChtId=${id}`
    window.open(pacsUrl, '_blank')
    toast({
      title: "正在外呼PACS系统",
      description: `档案号: ${id}。正在调用院内影像查看平台...`,
    })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              个人档案病历系统
              <Badge variant="secondary" className="bg-primary/10 text-primary">档案编号: {id}</Badge>
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={handleOpenPACS}>
            <ExternalLink className="size-4" />
            PACS调用
          </Button>
          <Button className="gap-2">
            <BadgeCheck className="size-4" />
            修改基本资料
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Enhanced Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-md border-none overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8">
              <div className="flex flex-col items-center">
                <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-white shadow-sm">
                  <User className="size-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{patient.name}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="bg-white">{patient.gender} / {patient.age}岁</Badge>
                  <Badge className={patient.status === '正常' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500'}>
                    {patient.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="size-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">身份证号</p>
                    <p className="font-mono text-sm">{patient.idNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="size-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">所属单位</p>
                    <p className="text-sm">{patient.org}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="size-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">联系电话</p>
                    <p className="text-sm">{patient.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">家庭住址</p>
                    <p className="text-xs leading-relaxed">{patient.address}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="size-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-900">临床摘要</span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  患者存在肺部实性结节风险（A类），随访闭环中。最后体检日期：{patient.lastExam}。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-amber-50/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                注意：档案编号为系统最高标识。若状态更新为“死亡”，系统将自动结案所有随访。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Clinical Timeline & Files */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full justify-start h-12 bg-white border-b rounded-none px-0 gap-8">
              <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-base gap-2">
                <History className="size-4" />
                病程/随访时间轴
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-base gap-2">
                <FileText className="size-4" />
                关联报告库 (PDF)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="mt-8">
              <div className="relative pl-8 ml-4 border-l-2 border-primary/10 space-y-10">
                {clinicalTimeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    {/* Event Node Icon */}
                    <div className={`absolute -left-[45px] top-0 size-8 rounded-full border-4 border-white shadow-md flex items-center justify-center ${
                      event.type === 'abnormal' ? 'bg-destructive' : 'bg-primary'
                    }`}>
                      {event.type === 'abnormal' ? <Stethoscope className="size-4 text-white" /> : <ClipboardCheck className="size-4 text-white" />}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">{event.date}</span>
                          {event.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] font-bold px-2 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-xl shadow-sm border border-muted/50">
                        <h4 className="text-xl font-bold text-foreground mb-2">{event.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-4">{event.description}</p>
                        
                        {event.files && (
                          <div className="flex flex-wrap gap-3 pt-3 border-t">
                            {event.files.map((file, fIdx) => (
                              <Button key={fIdx} variant="outline" size="sm" className="h-8 gap-2 bg-muted/30 hover:bg-primary/5 border-none text-xs">
                                <FileText className="size-3 text-primary" />
                                {file.name}
                                <Separator orientation="vertical" className="h-3" />
                                <span className="text-primary hover:underline">查看</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="files" className="mt-6">
              <Card className="border-none shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {clinicalTimeline.flatMap(h => h.files || []).map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-primary/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                          <FileText className="size-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{file.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">{file.category}</Badge>
                            <span className="text-[10px] text-muted-foreground">关联日期: 2025-01-01</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-primary">
                        <Download className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
