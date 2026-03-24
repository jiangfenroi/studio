
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for clinical monitoring
    console.error('System Runtime Error:', error);
  }, [error]);

  const isPermissionError = error.message.includes('Missing or insufficient permissions');

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl border border-destructive/20 overflow-hidden">
        <div className="p-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${isPermissionError ? 'bg-amber-100' : 'bg-red-100'}`}>
              {isPermissionError ? (
                <ShieldAlert className="size-10 text-amber-600" />
              ) : (
                <AlertCircle className="size-10 text-red-600" />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {isPermissionError ? '数据库访问受限' : '系统运行异常'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isPermissionError 
                ? '当前账号可能没有足够的权限访问此医疗数据，或 Firestore 索引正在生成中。'
                : '程序在处理临床数据时遇到了预期外的错误。'}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-left">
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">错误诊断代码</p>
            <p className="text-xs font-mono break-all line-clamp-4">{error.message || 'Unknown clinical exception'}</p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.href = '/'} 
              variant="outline" 
              className="flex-1"
            >
              返回主页
            </Button>
            <Button 
              onClick={() => reset()} 
              className="flex-1 gap-2"
            >
              <RefreshCcw className="size-4" />
              尝试重连
            </Button>
          </div>
        </div>
        <div className="bg-muted/30 px-6 py-3 border-t">
          <p className="text-[10px] text-center text-muted-foreground">
            HealthInsight Registry • 医疗内网故障诊断系统
          </p>
        </div>
      </div>
    </div>
  );
}
