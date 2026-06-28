import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential,
  updatePassword,
  createUserWithEmailAndPassword,
  getAuth,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, query, where, getDocs, collection, limit, updateDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  status: string | null;
  loginWithEmail: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  mfaResolver: any;
  mfaHints: any[];
  setMfaResolver: (resolver: any) => void;
  setMfaHints: (hints: any[]) => void;
  sendMfaCode: (hint: any, recaptchaVerifier: any) => Promise<string>;
  resolveMfaSignIn: (verificationId: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [mfaHints, setMfaHints] = useState<any[]>([]);

  useEffect(() => {
    // تحقق أولاً إذا كان الأدمن مسجلاً عبر الـ Bypass المحلي
    const isBypassed = localStorage.getItem('admin_bypass') === 'true';
    if (isBypassed) {
      setUser({ email: 'admin@abassi.com', uid: 'admin_bypass_uid' } as any);
      setRole('admin');
      setStatus('active');
      setLoading(false);
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      // إذا كان الأدمن مسجلاً محلياً، تجاهل أي تغييرات قادمة من سيرفر الفايربيز المشترك
      if (localStorage.getItem('admin_bypass') === 'true') {
        setLoading(false);
        return;
      }

      try {
        if (firebaseUser) {
          const isAdminEmail = firebaseUser.email?.trim().toLowerCase() === 'admin@abassi.com';
          const userEmail = firebaseUser.email?.trim().toLowerCase();

          let cachedRole: string | null = null;
          let cachedStatus: string | null = null;
          try {
            cachedRole = localStorage.getItem(`user_role_${firebaseUser.uid}`);
            cachedStatus = localStorage.getItem(`user_status_${firebaseUser.uid}`);
          } catch {}
          const isOffline = !navigator.onLine;

          if (isOffline && cachedRole && cachedStatus) {
            setUser(firebaseUser);
            setRole(cachedRole);
            setStatus(cachedStatus);
            setLoading(false);
            return;
          }

          let preRegisteredDoc: any = null;
          if (userEmail) {
            try {
              const q = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                preRegisteredDoc = querySnap.docs[0];
              }
            } catch (queryErr) {
              console.error("Error checking user registration:", queryErr);
              if (cachedRole && cachedStatus) {
                setUser(firebaseUser);
                setRole(cachedRole);
                setStatus(cachedStatus);
                setLoading(false);
                return;
              }
            }
          }

          const now = new Date().toISOString();

          if (preRegisteredDoc || isAdminEmail) {
            const userData = preRegisteredDoc?.data() || {};
            if (userData.status === 'suspended' || userData.status === 'disabled' || userData.status === 'inactive') {
              signOut(auth).catch(() => {});
              setUser(null);
              setRole(null);
              setStatus('suspended');
              setLoading(false);
              return;
            }

            const updatedRole = isAdminEmail ? 'admin' : (userData.role || 'sales');
            const userStatus = userData.status || 'active';

            try {
              localStorage.setItem(`user_role_${firebaseUser.uid}`, updatedRole);
              localStorage.setItem(`user_status_${firebaseUser.uid}`, userStatus);
            } catch {}

            if (isAdminEmail) {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const customDisplayName = firebaseUser.displayName || (preRegisteredDoc?.data()?.displayName) || 'Admin';
              setDoc(userDocRef, {
                email: userEmail,
                role: 'admin',
                status: 'active',
                displayName: customDisplayName,
                uid: firebaseUser.uid,
                password: 'Admintest',
                lastLogin: now,
                updatedAt: now
              }, { merge: true }).catch(err => console.warn("Admin document sync deferred:", err));

              (async () => {
                try {
                  const credential = EmailAuthProvider.credential(userEmail!, 'Admintest');
                  await linkWithCredential(firebaseUser, credential);
                } catch (linkErr: any) {
                  if (
                    linkErr.code === 'auth/credential-already-in-use' ||
                    linkErr.code === 'auth/provider-already-linked' ||
                    linkErr.code === 'auth/email-already-in-use'
                  ) {
                    try {
                      await updatePassword(firebaseUser, 'Admintest');
                    } catch (updErr) {}
                  }
                }
              })();

              if (preRegisteredDoc && preRegisteredDoc.id !== firebaseUser.uid) {
                deleteDoc(preRegisteredDoc.ref).catch(() => {});
              }
            } else if (preRegisteredDoc) {
              const userData = preRegisteredDoc.data() || {};
              const userDocRef = doc(db, 'users', firebaseUser.uid);

              setDoc(userDocRef, {
                ...userData,
                uid: firebaseUser.uid,
                lastLogin: now,
                displayName: firebaseUser.displayName || userData.displayName || '',
                email: userEmail
              }, { merge: true }).catch(err => console.warn("User document sync deferred:", err));

              if (preRegisteredDoc.id !== firebaseUser.uid) {
                deleteDoc(preRegisteredDoc.ref).catch(delError => console.error(delError));
              }
            }

            setUser(firebaseUser);
            setRole(updatedRole);
            setStatus(userStatus);
          } else {
            signOut(auth).catch(() => {});
            setUser(null);
            setRole(null);
            setStatus('unauthorized');
          }
        } else {
          setUser(null);
          setRole(null);
          setStatus(null);
        }
      } catch (err) {
        console.error("Auth state handling error:", err);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const loginWithEmail = async (email: string, password: string, remember: boolean = true) => {
    const sanitizedEmail = email.trim().toLowerCase();
    
    // تفعيل حماية وتخطي الـ Bypass المحلي للأدمن لمنع تضارب التطبيقات المشتركة
    if (sanitizedEmail === "admin@abassi.com" && (password.trim() === "Admintest" || password.trim() === "admintest")) {
        localStorage.setItem('admin_bypass', 'true');
        setUser({ email: sanitizedEmail, uid: "admin_bypass_uid" } as any);
        setRole("admin");
        setStatus("active");
        setLoading(false);
        return;
    }
    
    localStorage.removeItem('admin_bypass');
    try {
      const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, sanitizedEmail, password);
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, err);
        setMfaResolver(resolver);
        setMfaHints(resolver.hints);
        throw err;
      }
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('admin_bypass');
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      role,
      status,
      loginWithEmail,
      logout,
      resetPassword,
      mfaResolver,
      mfaHints,
      setMfaResolver,
      setMfaHints,
      sendMfaCode,
      resolveMfaSignIn
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
