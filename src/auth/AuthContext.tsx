import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
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
  const previousUserRef = useRef<User | null>(null);
  const isTransitioningRef = useRef(false);

  // Expose function to set transitioning state (for user creation)
  useEffect(() => {
    // Store transition flag in window for access from other components
    (window as any).__authTransitioning = false;
    (window as any).__setAuthTransitioning = (value: boolean) => {
      isTransitioningRef.current = value;
      (window as any).__authTransitioning = value;
      if (value && user) {
        // Store current user before transition starts
        previousUserRef.current = user;
      }
    };
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // If we're transitioning (creating user), keep the previous user to prevent redirect
      if (isTransitioningRef.current && previousUserRef.current) {
        // Keep showing the previous user (admin) during transition
        // Don't update user state, just keep loading false so app doesn't redirect
        setUser(previousUserRef.current);
        setLoading(false);
      } else {
        // Normal auth state change
        setUser(u);
        setLoading(false);
        previousUserRef.current = u;
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let stopped = false;
    async function fetchRole() {
      if (!user) { 
        setRole(null); 
        console.log('[AuthContext] No user, setting role to null');
        return; 
      }
      try {
        console.log(`[AuthContext] Fetching role for user: ${user.email} (uid: ${user.uid})`);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          console.warn(`[AuthContext] User document does not exist for uid: ${user.uid}`);
          if (!stopped) setRole(null);
          return;
        }
        
        const userData = userDoc.data();
        const roleValue = userData?.role;
        
        console.log(`[AuthContext] Raw role value from Firestore:`, roleValue, typeof roleValue);
        
        // Normalize role to lowercase for comparison
        let r: 'student' | 'teacher' | 'admin' | null = null;
        if (roleValue) {
          const roleStr = String(roleValue).trim().toLowerCase();
          console.log(`[AuthContext] Normalized role string: "${roleStr}"`);
          if (roleStr === 'student' || roleStr === 'teacher' || roleStr === 'admin') {
            r = roleStr as 'student' | 'teacher' | 'admin';
          } else {
            console.warn(`[AuthContext] Invalid role value: "${roleStr}" (not one of: student, teacher, admin)`);
          }
        } else {
          console.warn(`[AuthContext] Role field is missing or empty in user document`);
        }
        
        if (!stopped) {
          setRole(r);
          console.log(`[AuthContext] Role set for ${user.email}: ${r} (original value: ${roleValue})`);
        }
      } catch (error) {
        console.error('[AuthContext] Error fetching user role:', error);
        if (!stopped) {
          setRole(null);
          console.log('[AuthContext] Role set to null due to error');
        }
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
