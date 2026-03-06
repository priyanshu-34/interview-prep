import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const SESSION_KEY = 'firestore-write-ok';

/** Runs a one-time write test when user is signed in. Skips if already OK this session to save quota. */
export function useFirestoreWriteCheck() {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setState('idle');
      setError(null);
      return;
    }
    try {
      if (sessionStorage.getItem(`${SESSION_KEY}-${user.uid}`) === '1') {
        setState('ok');
        return;
      }
    } catch {
      // ignore sessionStorage errors
    }
    const ref = doc(db, 'users', user.uid, '_check', 'write');
    setDoc(ref, { t: true })
      .then(() => {
        setState('ok');
        try {
          sessionStorage.setItem(`${SESSION_KEY}-${user.uid}`, '1');
        } catch {
          // ignore
        }
      })
      .catch((err: unknown) => {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        const msg = err instanceof Error ? err.message : String(err);
        const friendly =
          code === 'resource-exhausted'
            ? 'Firestore quota exceeded. Try again later or upgrade to Blaze plan in Firebase Console.'
            : code === 'permission-denied'
              ? 'Permission denied (deploy Firestore rules).'
              : msg || code;
        setError(friendly);
        setState('fail');
        console.error('[Firestore] Write check failed:', code, msg, 'Path: users/', user.uid, '/_check/write');
      });
  }, [user?.uid]);

  return { writeOk: state === 'ok', writeFailed: state === 'fail', error };
}
