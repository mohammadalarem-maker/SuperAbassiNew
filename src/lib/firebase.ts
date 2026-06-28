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
