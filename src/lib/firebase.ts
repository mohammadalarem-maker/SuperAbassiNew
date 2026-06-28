import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// تحويلها إلى كائن حقيقي (Object) يحتوي على خيار LIST لإصلاح خطأ البناء
export const OperationType = {
  LIST: 'LIST',
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
  READ: 'read',
  QUERY: 'query'
} as const;

// تحديث الدالة لتستقبل العمليات وأسماء المجموعات المتمررة إليها
export const handleFirestoreError = (error: any, operation?: string, collectionName?: string) => {
  console.error(`Firestore Error [${operation || 'unknown'}] on [${collectionName || 'unknown'}]:`, error);
  return error?.message || "حدث خطأ في قاعدة البيانات";
};
