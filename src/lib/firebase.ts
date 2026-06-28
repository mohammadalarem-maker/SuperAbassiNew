import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDe5YiK-zxhfBWKvOuQxr4NC5M8s4oFGxc",
  authDomain: "mohalistore-fa8b3.firebaseapp.com",
  databaseURL: "https://mohalistore-fa8b3-default-rtdb.firebaseio.com",
  projectId: "mohalistore-fa8b3",
  storageBucket: "mohalistore-fa8b3.firebasestorage.app",
  messagingSenderId: "795331442491",
  appId: "1:795331442491:web:41318aeeda23df6078291e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// كائن العمليات الخاص بملف البيانات
export const OperationType = {
  LIST: 'LIST',
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
  READ: 'read',
  QUERY: 'query'
} as const;

// دالة معالجة الأخطاء المتوافقة
export const handleFirestoreError = (error: any, operation?: string, collectionName?: string) => {
  console.error(`Firestore Error [${operation || 'unknown'}] on [${collectionName || 'unknown'}]:`, error);
  return error?.message || "حدث خطأ في قاعدة البيانات";
};
