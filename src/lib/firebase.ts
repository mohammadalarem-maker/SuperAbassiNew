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

// دالة الذكاء الاصطناعي لتصنيف المنتجات تلقائياً باستخدام جيميناي لسوبرماركت العباسي
export const runGeminiAIProductCategorizer = async (productName: string): Promise<string> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `أنت مساعد ذكي مخصص لسوبرماركت العباسي. قم بتصنيف المنتج التالي وتحديد قسم مناسب له (مثل: مواد غذائية، منظفات، معلبات، ألبان وأجبان، حلويات، مشروبات، إلخ). اعطني اسم القسم فقط بكلمة أو كلمتين وبدون أي شرح أو نقاط إضافية أو علامات ترقيم: "${productName}"`
          }]
        }]
      })
    });
    
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || "عام";
  } catch (error) {
    console.error("Gemini AI Categorizer Error:", error);
    return "عام";
  }
};
