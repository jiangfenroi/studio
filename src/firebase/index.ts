'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// 初始化 Firebase 核心服务
export function initializeFirebase() {
  if (!getApps().length) {
    // 始终使用提供的配置初始化，确保内网环境连接稳定性
    const firebaseApp = initializeApp(firebaseConfig);
    const sdks = getSdks(firebaseApp);
    
    // 强制设置为“浏览器会话”持久化：
    // 关闭标签页或退出程序后，登录凭据立即失效，不留存后台进程。
    setPersistence(sdks.auth, browserSessionPersistence).catch((err) => {
      console.error("Auth persistence setup failed:", err);
    });

    return sdks;
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
