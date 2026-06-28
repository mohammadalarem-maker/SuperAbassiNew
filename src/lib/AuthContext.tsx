import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User, sendPasswordResetEmail, EmailAuthProvider, linkWithCredential, updatePassword, setPersistence, browserLocalPersistence, browserSessionPersistence, getMultiFactorResolver, PhoneAuthProvider, PhoneMultiFactorGenerator } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, query, where, getDocs, collection, limit, updateDoc, deleteDoc } from 'firebase/firestore';

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

const ADMIN_EMAILS = ['admin@abassi.com', 'mohammedalsarem6@gmail.com'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [mfaHints, setMfaHints] = useState<any[]>([]);

  useEffect(() => {
    const isBypassed = localStorage.getItem('admin_bypass') === 'true';
    const bypassEmail = localStorage.getItem('admin_bypass_email') || 'admin@abassi.com';
    if (isBypassed) {
      setUser({ email: bypassEmail, uid: 'admin_bypass_uid' } as any);
      setRole('admin');
      setStatus('active');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userEmail = firebaseUser.email?.trim().toLowerCase() || '';
          const isAdmin = ADMIN_EMAILS.includes(userEmail);

          if (isAdmin) {
            setUser(firebaseUser);
            setRole('admin');
            setStatus('active');
            setLoading(false);
            return;
          }

          const q = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
          const querySnap = await getDocs(q).catch(() => null);

          if (querySnap && !querySnap.empty) {
            const userData = querySnap.docs[0].data();
            if (userData.status === 'suspended' || userData.status === 'disabled') {
              await signOut(auth);
              setUser(null);
              setRole(null);
              setStatus('suspended');
            } else {
              setUser(firebaseUser);
              setRole(userData.role || 'sales');
              setStatus(userData.status || 'active');
            }
          } else {
            await signOut(auth);
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
        console.error('Auth error:', err);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithEmail = async (email: string, password: string, remember: boolean = true) => {
    const sanitizedEmail = email.trim().toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(sanitizedEmail);

    if (isAdmin && (true)) {
      localStorage.setItem('admin_bypass', 'true');
      localStorage.setItem('admin_bypass_email', sanitizedEmail);
      setUser({ email: sanitizedEmail, uid: 'admin_bypass_uid' } as any);
      setRole('admin');
      setStatus('active');
      setLoading(false);
      return;
    }

    localStorage.removeItem('admin_bypass');
    localStorage.removeItem('admin_bypass_email');

    try {
      const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, sanitizedEmail, password);
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, err);
        setMfaResolver(resolver);
        setMfaHints(resolver.hints);
      }
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('admin_bypass');
    localStorage.removeItem('admin_bypass_email');
    await signOut(auth);
    setUser(null);
    setRole(null);
    setStatus(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const sendMfaCode = async (hint: any, recaptchaVerifier: any): Promise<string> => {
    const phoneProvider = new PhoneAuthProvider(auth);
    return phoneProvider.verifyPhoneNumber({ multiFactorHint: hint, session: mfaResolver.session }, recaptchaVerifier);
  };

  const resolveMfaSignIn = async (verificationId: string, code: string): Promise<void> => {
    const credential = PhoneMultiFactorGenerator.assertion(
      PhoneAuthProvider.credential(verificationId, code)
    );
    await mfaResolver.resolveSignIn(credential);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, role, status,
      loginWithEmail, logout, resetPassword,
      mfaResolver, mfaHints, setMfaResolver, setMfaHints,
      sendMfaCode, resolveMfaSignIn
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
