
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
  nextFollowUpDate?: string;
}

export interface PatientInfo {
  archiveNo: string;
  name: string;
  gender: '男' | '女' | '其他';
  age: number;
  phone: string;
}

export interface FollowUpRecord {
  id: string;
  resultId: string;
  archiveNo: string;
  followUpResult: string;
  followUpPerson: string;
  followUpDate: string;
  followUpTime: string;
  isReExamined: boolean;
  fileUrl?: string;
  fileExamDate?: string;
  fileCategory?: '影像检查报告' | '病理检查报告';
  createdAt: string;
}
