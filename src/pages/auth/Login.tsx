import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, User, Lock, Loader2 } from "lucide-react";

export default function Login() {
  const [identifier, setIdentifier] = useState(""); // Can be roll number or email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Helper function to check if input is an email
  const isEmail = (str: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const trimmedIdentifier = identifier.trim();
      
      if (!trimmedIdentifier) {
        setError("Please enter your roll number or email.");
        setLoading(false);
        return;
      }
      
      let userEmail: string;
      
      // Check if input is an email or roll number
      if (isEmail(trimmedIdentifier)) {
        // User entered an email - use it directly
        console.log('[Login] Email detected, using directly:', trimmedIdentifier);
        userEmail = trimmedIdentifier;
      } else {
        // User entered a roll number - find user by roll number
        console.log('[Login] Roll number detected, searching in Firestore:', trimmedIdentifier);
        
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('rollNumber', '==', trimmedIdentifier));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            console.log('[Login] No user found with roll number:', trimmedIdentifier);
            setError("No user found with this roll number. Please check and try again.");
            setLoading(false);
            return;
          }
          
          // Get the first matching user (roll numbers should be unique)
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          userEmail = userData.email;
          
          console.log('[Login] Found user by roll number:', { 
            uid: userDoc.id, 
            email: userEmail, 
            rollNumber: userData.rollNumber,
            displayName: userData.displayName 
          });
          
          if (!userEmail) {
            console.error('[Login] User document missing email:', userDoc.id);
            setError("User account is missing email. Please contact administrator.");
            setLoading(false);
            return;
          }
        } catch (queryError: any) {
          console.error('[Login] Firestore query error:', queryError);
          if (queryError.code === 'failed-precondition') {
            setError("Database index required for roll number search. Please contact administrator or use email to login.");
          } else {
            setError(`Database error: ${queryError.message || 'Please try again.'}`);
          }
          setLoading(false);
          return;
        }
      }
      
      // Now authenticate with the email (either directly entered or found from roll number)
      console.log('[Login] Attempting authentication with email:', userEmail);
      const cred = await signInWithEmailAndPassword(auth, userEmail, password);
      
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
      console.error('[Login] Authentication error:', err);
      let message = "Failed to sign in. Please try again.";
      const code: string | undefined = err?.code;
      
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        message = "Invalid roll number/email or password.";
      } else if (code === "auth/user-not-found") {
        message = "No user found with this roll number or email.";
      } else if (code === "auth/too-many-requests") {
        message = "Too many attempts. Please wait and try again.";
      } else if (code === "auth/network-request-failed") {
        message = "Network error. Check your connection.";
      } else if (code === "failed-precondition") {
        message = "Database index required. Please contact administrator or use email to login.";
      } else if (err.message) {
        // Use the error message if available
        if (err.message.includes("roll number") || err.message.includes("No user found")) {
          message = err.message;
        } else {
          message = `Error: ${err.message}`;
        }
      }
      
      console.error('[Login] Final error message:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 p-4">
      <div className="w-full max-w-md">
        <form
          onSubmit={onSubmit}
          className="card p-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-neutral-200/50 dark:border-neutral-700/50"
        >
          {/* 🎓 College Logo + Name */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <img
              src="/college-logo.png"
              alt="College Logo"
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
            <div className="text-center">
              <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                Bharat Institute of Engineering & Technology
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Student Portal
              </p>
            </div>
          </div>

          {/* 🧠 Input Fields */}
          <div className="space-y-4">
            {/* Roll Number or Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isEmail(identifier) ? (
                  <Mail className="h-5 w-5 text-neutral-400" />
                ) : (
                  <User className="h-5 w-5 text-neutral-400" />
                )}
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:ring-indigo-400/50 dark:focus:border-indigo-400 transition-all duration-200"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your roll number or email"
                disabled={loading}
                required
              />
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:ring-indigo-400/50 dark:focus:border-indigo-400 transition-all duration-200"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-200"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !identifier || !password}
              className="w-full mt-6 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="mt-6 text-center">
            <Link
              to="/auth/reset"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors duration-200"
            >
              Forgot password?
            </Link>
          </div>

          {/* Footer - Designed by SPREAD */}
          <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span>Designed and developed by</span>
              <a
                href="https://aspread.site"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200"
              >
                <img
                  src="/ananta.png"
                  alt="SPREAD"
                  className="h-14 w-14 object-contain"
                  onError={(e) => {
                    // Fallback if image doesn't exist - hide the image element
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"></span>
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


