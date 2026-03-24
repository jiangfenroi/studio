
export type AbnormalCategory = 'A' | 'B';

export interface AbnormalResult {
  id: string;
  archiveNo: string;
  examNo: string;
  examDate: string;
  notifiedPerson: string;
  category: AbnormalCategory;
  details: string;
  disposalAdvice: string;
  isNotified: boolean;
  isHealthEducation: boolean;
  notifier: string;
  feedback: string;
  noticeDate: string;
  noticeTime: string;
  reportPdfUrl?: string;
  createdAt: string;
}

export interface PatientInfo {
  archiveNo: string;
  name: string;
  gender: '男' | '女' | '其他';
  age: number;
  phone: string;
}
