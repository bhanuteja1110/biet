import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Bell, CalendarDays, ClipboardList, GraduationCap, Home, LogOut, Settings, UserRound, Wallet, BookOpen, FileBarChart, Library, FileText, Megaphone, Files, MessageSquare, Bus, BriefcaseBusiness } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebase';

function navForRole(role: 'student' | 'teacher' | 'admin' | null) {
  if (role === 'teacher') {
    return [
      { to: '/teacher', label: 'Teacher Home', icon: Home },
      { to: '/assignments', label: 'Assignments', icon: ClipboardList },
      { to: '/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/attendance', label: 'Attendance', icon: GraduationCap },
      { to: '/marks', label: 'Marks', icon: FileBarChart },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/timetable', label: 'Time Table', icon: BookOpen },
      { to: '/chat', label: 'Discussion', icon: MessageSquare },
      { to: '/settings', label: 'Settings', icon: Settings },
    ];
  }
  if (role === 'admin') {
    return [
      { to: '/admin', label: 'Admin Home', icon: Home },
      { to: '/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/fees', label: 'Fees', icon: Wallet },
      { to: '/placements', label: 'Placements', icon: BriefcaseBusiness },
      { to: '/transport', label: 'Transport', icon: Bus },
      { to: '/documents', label: 'Documents', icon: Files },
      { to: '/settings', label: 'Settings', icon: Settings },
    ];
  }
  // default student
  return [
    { to: '/', label: 'Dashboard', icon: Home },
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
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate('/auth/login');
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
              <div className="font-medium">{user?.displayName ?? 'Student'}</div>
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


