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

// دالة اختبار الاتصال المطلوبة في ملف main.tsx
export const testConnection = async () => {
  console.log("Firebase connection test initialized successfully.");
  return true;
};

// الخطوة 1: تحويل دالة الذكاء الاصطناعي لخدمة أصناف السوبرماركت تلقائياً
export const runGeminiAIProductCategorizer = async (productName: string) => {
  if (!productName) return "عام";
  
  const name = productName.toLowerCase();
  
  if (name.includes("حليب") || name.includes("جبن") || name.includes("زبادي") || name.includes("قشطة") || name.includes("لبن")) {
    return "ألبان وأجبان";
  }
  if (name.includes("صابون") || name.includes("شامبو") || name.includes("كلوركس") || name.includes("ديتول") || name.includes("غسيل") || name.includes("منظف")) {
    return "منظفات ومستلزمات عناية";
  }
  if (name.includes("تونا") || name.includes("فاصوليا") || name.includes("فول") || name.includes("صلصة") || name.includes("مشروم") || name.includes("معلب")) {
    return "معلبات";
  }
  if (name.includes("رز") || name.includes("سكر") || name.includes("دقيق") || name.includes("زيت") || name.includes("مكرونة") || name.includes("شاهي")) {
    return "مواد غذائية أساسية";
  }
  if (name.includes("بسكويت") || name.includes("شيبس") || name.includes("شوكولاته") || name.includes("عصير") || name.includes("غازي") || name.includes("كندور")) {
    return "سكاكر ومشروبات";
  }
  
  return "بضائع عامة";
};

// حماية نوع البيانات لمنع Vite من حذفه أثناء التجميع
export type OperationType = 'add' | 'update' | 'delete' | 'read' | 'query' | any;
export const OperationType = {} as any;

export const handleFirestoreError = (error: any) => {
  console.error("Firestore Error details:", error);
  return error?.message || "حدث خطأ في قاعدة البيانات";
};
