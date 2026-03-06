import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnon: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRedirectResult(auth)
      .then(() => {})
      .catch((err) => {
        if (!cancelled) console.error('[Auth] Redirect result error:', err?.code, err?.message);
      });
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!cancelled) {
        setUser(u ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message;
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user' ||
        (message && message.includes('window.closed'))
      ) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } else {
        console.error('[Auth] Google sign-in failed:', code, message);
        throw err;
      }
    }
  }, []);

  const signInAnon = useCallback(async () => {
    await signInAnonymously(auth);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signInWithGoogle,
    signInAnon,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
