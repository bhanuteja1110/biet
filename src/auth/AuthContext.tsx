import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  role: 'student' | 'teacher' | 'admin' | null;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, role: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let stopped = false;
    async function fetchRole() {
      if (!user) { setRole(null); return; }
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        const r = (snap.data()?.role as 'student' | 'teacher' | 'admin' | undefined) ?? null;
        if (!stopped) setRole(r);
      } catch {
        if (!stopped) setRole(null);
      }
    }
    fetchRole();
    return () => { stopped = true; };
  }, [user]);

  const value = useMemo(() => ({ user, loading, role }), [user, loading, role]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


