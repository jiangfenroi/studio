
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * 初始化 Firebase 核心服务。
 * 针对医疗内网环境优化：
 * 1. 强制会话持久化：关闭标签页或重启程序即自动注销，保障临床账户安全。
 * 2. 生产环境直连：保障数据同步的唯一性。
 */
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    const sdks = getSdks(firebaseApp);
    
    // 强制将会话持久化设置为浏览器会话级别，实现“关闭即登出”
    setPersistence(sdks.auth, browserSessionPersistence).catch((err) => {
      console.warn("Auth persistence failed, but continuing with session default.");
    });

    return sdks;
  }

  const app = getApp();
  return getSdks(app);
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
