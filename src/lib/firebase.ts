import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCKm5_G9ZD0WviePat93gJ7Pz9QS1NiBew",
  authDomain: "abassi-final.firebaseapp.com",
  projectId: "abassi-final",
  storageBucket: "abassi-final.firebasestorage.app",
  messagingSenderId: "115512089872",
  appId: "1:115512089872:web:e6513acbde5eedf8635995"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const OperationType = {
  LIST: 'LIST',
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
  READ: 'read',
  QUERY: 'query'
} as const;

export const handleFirestoreError = (error: any, operation?: string, collectionName?: string) => {
  console.error(`Firestore Error [${operation || 'unknown'}] on [${collectionName || 'unknown'}]:`, error);
  return error?.message || "حدث خطأ في قاعدة البيانات";
};

export const runGeminiAIProductCategorizer = async (productName: string): Promise<string> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `أنت مساعد ذكي مخصص لسوبرماركت العباسي. قم بتصنيف المنتج التالي وتحديد قسم مناسب له: "${productName}"` }] }]
      })
    });
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "عام";
  } catch (error) {
    console.error("Gemini AI Categorizer Error:", error);
    return "عام";
  }
};

export const testConnection = async (): Promise<boolean> => {
  try { return true; } catch (error) { return false; }
};
