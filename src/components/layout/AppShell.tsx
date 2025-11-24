import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { CalendarDays, ClipboardList, GraduationCap, Home, LogOut, Settings, UserRound, Wallet, BookOpen, FileBarChart, Library, FileText, Megaphone, Files, MessageSquare, Bus, BriefcaseBusiness, Users, School } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { useEffect } from 'react';
import Loader from '../Loader';

function navForRole(role: 'student' | 'teacher' | 'admin' | null) {
  if (role === 'teacher') {
    return [
      { to: '/teacher', label: 'Teacher Home', icon: Home },
      { to: '/teacher/attendance', label: 'Attendance', icon: GraduationCap },
      { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
      { to: '/teacher/marks', label: 'Marks', icon: FileBarChart },
      { to: '/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/timetable', label: 'Time Table', icon: BookOpen },
      { to: '/chat', label: 'Discussion', icon: MessageSquare },
      { to: '/settings', label: 'Settings', icon: Settings },
    ];
  }
  if (role === 'admin') {
    return [
      { to: '/admin', label: 'Admin Home', icon: Home },
      { to: '/admin/students', label: 'Students', icon: UserRound },
      { to: '/admin/teachers', label: 'Teachers', icon: Users },
      { to: '/admin/classes', label: 'Classes', icon: School },
      { to: '/admin/timetable', label: 'Manage Timetables', icon: BookOpen },
      { to: '/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/fees', label: 'Fees', icon: Wallet },
      { to: '/placements', label: 'Placements', icon: BriefcaseBusiness },
      { to: '/transport', label: 'Transport', icon: Bus },
      { to: '/timetable', label: 'View Timetable', icon: BookOpen },
      { to: '/settings', label: 'Settings', icon: Settings },
    ];
  }
  // default student
  return [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/attendance', label: 'Attendance', icon: GraduationCap },
    { to: '/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/timetable', label: 'Time Table', icon: BookOpen },
    { to: '/marks', label: 'Marks', icon: FileBarChart },
    { to: '/library', label: 'Library', icon: Library },
    { to: '/exams', label: 'Exams', icon: FileText },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/documents', label: 'Documents', icon: Files },
    { to: '/chat', label: 'Discussion', icon: MessageSquare },
    { to: '/placements', label: 'Placements', icon: BriefcaseBusiness },
    { to: '/transport', label: 'Transport', icon: Bus },
    { to: '/fees', label: 'Fees', icon: Wallet },
    { to: '/profile', label: 'Profile', icon: UserRound },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];
}

export function AppShell() {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Protect routes based on role and redirect to correct dashboard
  useEffect(() => {
    if (loading || !user) {
      console.log('[AppShell] Waiting for auth:', { loading, hasUser: !!user });
      return;
    }

    const path = location.pathname;
    
    console.log('[AppShell] Route protection check:', { path, role, userEmail: user.email });
    
    // Shared routes that all roles can access
    const sharedRoutes = [
      '/announcements',
      '/fees',
      '/placements',
      '/transport',
      '/timetable',
      '/settings',
      '/profile',
      '/calendar',
      '/chat',
      '/documents',
      '/library',
      '/exams',
    ];
    
    const isSharedRoute = sharedRoutes.some(route => path === route || path.startsWith(route + '/'));
    
    // If role is detected, redirect admins/teachers to their dashboards IMMEDIATELY
    // But allow access to shared routes
    if (role === 'admin') {
      // Redirect admin from root or student dashboard to admin dashboard
      if (path === '/' || path === '/dashboard') {
        console.log('[AppShell] Admin detected on root/dashboard, redirecting to /admin');
        navigate('/admin', { replace: true });
        return;
      }
      // Allow admins to access shared routes and admin routes
      if (!path.startsWith('/admin') && !path.startsWith('/auth') && !isSharedRoute && path !== '/' && path !== '/dashboard') {
        console.log('[AppShell] Admin trying to access non-admin route, redirecting to /admin from:', path);
        navigate('/admin', { replace: true });
        return;
      }
    }
    
    if (role === 'teacher') {
      // Redirect teacher from root or student dashboard to teacher dashboard
      if (path === '/' || path === '/dashboard') {
        console.log('[AppShell] Teacher detected on root/dashboard, redirecting to /teacher');
        navigate('/teacher', { replace: true });
        return;
      }
      // Allow teachers to access shared routes and teacher routes
      if (!path.startsWith('/teacher') && !path.startsWith('/auth') && !isSharedRoute && path !== '/' && path !== '/dashboard') {
        console.log('[AppShell] Teacher trying to access non-teacher route, redirecting to /teacher from:', path);
        navigate('/teacher', { replace: true });
        return;
      }
    }
    
    // Students should be redirected to /dashboard if they're on root
    if (role === 'student' || (!role && user)) {
      if (path === '/') {
        console.log('[AppShell] Student or no role on root, redirecting to /dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }
    }
    
    // If no role yet, wait for it to be detected (but only for a short time)
    if (!role) {
      console.log('[AppShell] Role not detected yet, waiting...');
      // Don't block navigation if role is null - let user stay where they are
      // The role will be detected soon by AuthContext
      return;
    }
    
    // Admin routes - only admins can access
    if (path.startsWith('/admin')) {
      if (role !== 'admin') {
        console.log(`[AppShell] Non-admin (${role}) trying to access /admin, redirecting...`);
        if (role === 'teacher') {
          navigate('/teacher', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }
    
    // Teacher routes - only teachers can access
    if (path.startsWith('/teacher')) {
      if (role !== 'teacher') {
        console.log(`[AppShell] Non-teacher (${role}) trying to access /teacher, redirecting...`);
        if (role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }
    
    // Student dashboard route - only students should access
    if (path === '/dashboard' || path.startsWith('/dashboard')) {
      if (role === 'admin') {
        console.log('[AppShell] Admin trying to access student dashboard, redirecting to /admin');
        navigate('/admin', { replace: true });
        return;
      }
      if (role === 'teacher') {
        console.log('[AppShell] Teacher trying to access student dashboard, redirecting to /teacher');
        navigate('/teacher', { replace: true });
        return;
      }
    }
  }, [location.pathname, role, user, loading, navigate]);

  async function handleLogout() {
    await signOut(auth);
    navigate('/auth/login');
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  // Don't redirect if we're transitioning (creating user) - AuthContext keeps previous user during transition
  const isTransitioning = (window as any).__authTransitioning === true;
  if (!user && !isTransitioning) {
    return <Navigate to="/auth/login" replace />;
  }

  const navItems = navForRole(role);

  return (
    <div className="min-h-dvh grid grid-cols-[260px,1fr]">
      <aside className="relative flex flex-col border-r border-neutral-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 backdrop-blur">
        <div className="h-16 px-4 flex items-center gap-3">
          <div className="size-8 rounded-xl gradient-accent" />
          <div className="font-semibold text-sm leading-tight">Bharat Institute of Engineering & Technology</div>
        </div>
        <nav className="px-2 py-2 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${location.pathname === to ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 mt-auto space-y-2">
          <Link to="/profile" className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <img alt="avatar" src={user?.photoURL ?? 'https://i.pravatar.cc/100?img=5'} className="size-8 rounded-lg object-cover" />
            <div className="text-sm">
              <div className="font-medium">{user?.displayName ?? (role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Student')}</div>
              <div className="text-neutral-500 truncate">{user?.email ?? 'student@example.com'}</div>
            </div>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left">
            <LogOut className="size-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

