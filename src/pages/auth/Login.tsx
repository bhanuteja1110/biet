import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [monkeyState, setMonkeyState] = useState("idle"); // idle | email-focused | password-focused | blinking
  const navigate = useNavigate();

  // Blink every 2 seconds when not typing password
  useEffect(() => {
    if (monkeyState === "password-focused") return; // don't blink when covering eyes

    const interval = setInterval(() => {
      setMonkeyState("blinking");
      setTimeout(() => {
        if (monkeyState !== "password-focused") setMonkeyState("idle");
      }, 200);
    }, 4000);

    return () => clearInterval(interval);
  }, [monkeyState]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // Get actual role from Firestore (not from user input!)
      let actualRole: 'student' | 'teacher' | 'admin' | null = null;
      try {
        const userDoc = await getDoc(doc(db, "users", cred.user.uid));
        
        // Check if document exists
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const roleValue = userData?.role;
          
          // Normalize role to lowercase (same as AuthContext does)
          if (roleValue) {
            const roleStr = String(roleValue).trim().toLowerCase();
            if (roleStr === 'student' || roleStr === 'teacher' || roleStr === 'admin') {
              actualRole = roleStr as 'student' | 'teacher' | 'admin';
            }
          }
          
          console.log(`[Login] Role detected for ${cred.user.email}: ${actualRole} (from Firestore: ${roleValue})`);
        } else {
          // Document doesn't exist - this is okay, user might be new
          // AuthContext will handle role detection later
          console.warn('User document does not exist in Firestore for:', cred.user.uid);
          console.warn('User will be logged in with default role. Admin should create user profile.');
        }
        
        // Store password in sessionStorage for admin/teacher to create users without logging out
        // This is cleared when browser closes (sessionStorage)
        if (actualRole === "admin" || actualRole === "teacher") {
          sessionStorage.setItem('admin_password', password);
        }
        
        // Navigate based on ACTUAL role from Firestore, not user selection
        // If role is null/undefined, AuthContext will handle it and user can still access student dashboard
        console.log(`[Login] Navigating based on role: ${actualRole}`);
        if (actualRole === "admin") {
          console.log('[Login] Admin detected, navigating to /admin');
          navigate("/admin", { replace: true });
        } else if (actualRole === "teacher") {
          console.log('[Login] Teacher detected, navigating to /teacher');
          navigate("/teacher", { replace: true });
        } else {
          // Default to student dashboard if no role or role is student
          console.log('[Login] No role or student role, navigating to /dashboard');
          navigate("/dashboard", { replace: true });
        }
      } catch (roleErr: any) {
        console.error('Error fetching user role:', roleErr);
        
        // Don't block login on errors - let AuthContext handle role detection
        // This allows users to login even if there's a temporary Firestore issue
        console.warn('Could not fetch user role during login, but allowing login to proceed');
        console.warn('AuthContext will attempt to fetch role after login');
        
        // Still try to navigate - AuthContext will handle role-based routing
        navigate("/dashboard");
      }
    } catch (err: any) {
      let message = "Failed to sign in. Please try again.";
      const code: string | undefined = err?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password")
        message = "Invalid email or password.";
      else if (code === "auth/user-not-found")
        message = "No user found with this email.";
      else if (code === "auth/too-many-requests")
        message = "Too many attempts. Please wait and try again.";
      else if (code === "auth/network-request-failed")
        message = "Network error. Check your connection.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-br from-neutral-100 via-white to-neutral-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
      <div className="w-full max-w-sm">
        <form
          onSubmit={onSubmit}
          className="card p-6 bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10"
        >
          {/* 🐵 Monkey Mascot */}
          <div className="flex justify-center mb-6">
            <img
              src={
                monkeyState === "password-focused"
                  ? "/monkey-hands.png"
                  : monkeyState === "blinking"
                  ? "/monkey-closed.png"
                  : "/monkey-open.png"
              }
              alt="Monkey Mascot"
              className="w-32 h-32 drop-shadow-md transition-all duration-200"
            />
          </div>

          {/* 🎓 College Logo + Name */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/college-logo.png"
              alt="College Logo"
              className="w-11 h-12 object-contain drop-shadow-md"
            />
            <div className="text-lg font-semibold text-center text-neutral-800 dark:text-neutral-100">
              Bharat Institute of Engineering & Technology
            </div>
          </div>

          {/* 🧠 Input Fields */}
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
              value={email}
              onFocus={() => setMonkeyState("email-focused")}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setMonkeyState("idle")}
              placeholder="Email"
            />

            <input
              type="password"
              className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
              value={password}
              onFocus={() => setMonkeyState("password-focused")}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setMonkeyState("idle")}
              placeholder="Password"
            />

            {error && <div className="text-sm text-rose-600">{error}</div>}

            <button
              disabled={loading}
              className="mt-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:scale-105 transition-transform duration-200"
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </div>

          <div className="mt-4 text-sm flex justify-end">
            <Link
              to="/auth/reset"
              className="underline text-neutral-600 dark:text-neutral-300"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}


