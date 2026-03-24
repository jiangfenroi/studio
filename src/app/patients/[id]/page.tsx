
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
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

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

  // Mock medical history events
  const history = [
    { 
      type: 'abnormal', 
      date: '2025-01-01', 
      title: '肺部结节 (8mm) - A类', 
      content: '体检号：202501010001。右肺中叶胸膜下见实性结节影。',
      files: [{ name: '20250101体检报告.pdf', category: '体检报告' }]
    },
    { 
      type: 'followup', 
      date: '2025-01-08', 
      title: '随访记录 (通知完成)', 
      content: '家属已知情，表示近期带患者前往呼吸内科门诊。'
    },
    { 
      type: 'abnormal', 
      date: '2024-05-12', 
      title: '空腹血糖 7.2mmol/L - B类', 
      content: '体检号：202405120012。建议进行糖化血红蛋白复查。',
      files: [{ name: '20240512影像报告.pdf', category: '影像检查报告' }]
    }
  ]

  const handleOpenPACS = () => {
    const pacsUrl = `http://172.16.201.61:7242/?ChtId=${id}`
    window.open(pacsUrl, '_blank')
    toast({
      title: "正在调用PACS系统",
      description: `已尝试打开外部链接: ${pacsUrl}`,
    })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              个人档案详情
              <Badge variant="secondary" className="bg-primary/10 text-primary">档案编号: {id}</Badge>
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleOpenPACS}>
            <ExternalLink className="size-4" />
            PACS调用
          </Button>
          <Button className="gap-2">
            <BadgeCheck className="size-4" />
            编辑资料
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Basic Info */}
        <Card className="lg:col-span-1 shadow-md border-none">
          <CardHeader className="bg-primary/5 pb-8">
            <div className="flex flex-col items-center">
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="size-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{patient.name}</h2>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{patient.gender} / {patient.age}岁</Badge>
                <Badge className={patient.status === '正常' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {patient.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">身份证号</p>
                  <p className="font-mono">{patient.idNumber}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">所属单位</p>
                  <p>{patient.org}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">联系电话</p>
                  <p>{patient.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">家庭住址</p>
                  <p className="text-sm leading-relaxed">{patient.address}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Calendar className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">最后体检日期</p>
                  <p className="font-bold text-primary">{patient.lastExam}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: History Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none px-0 gap-6">
              <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-base">
                诊疗/随访时间轴
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-base">
                关联附件 (PDF)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="mt-6">
              <div className="relative pl-6 border-l-2 border-primary/20 space-y-12">
                {history.map((event, idx) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[33px] top-0 size-4 rounded-full border-2 border-background ${event.type === 'abnormal' ? 'bg-destructive' : 'bg-primary'}`} />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">{event.date}</span>
                        {event.type === 'abnormal' && <Badge variant="destructive">重要异常</Badge>}
                      </div>
                      <h4 className="text-lg font-bold">{event.title}</h4>
                      <p className="text-muted-foreground leading-relaxed">{event.content}</p>
                      
                      {event.files && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {event.files.map((file, fIdx) => (
                            <Button key={fIdx} variant="secondary" size="sm" className="gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-none">
                              <FileText className="size-4" />
                              {file.name}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="files" className="mt-6">
              <Card className="border-none shadow-sm bg-muted/20">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {history.flatMap(h => h.files || []).map((file, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-primary/10">
                            <FileText className="size-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.category}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="size-4 mr-2" /> 下载
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
