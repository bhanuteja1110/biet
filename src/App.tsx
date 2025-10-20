import { Route, Routes, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider } from './auth/AuthContext';
import { AppShell } from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Assignments from './pages/Assignments';
import CalendarPage from './pages/CalendarPage';
import Profile from './pages/Profile';
import Fees from './pages/Fees';
import Settings from './pages/Settings';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ResetPassword from './pages/auth/ResetPassword';
import TimeTable from './pages/TimeTable';
import Marks from './pages/Marks';
import LibraryPage from './pages/LibraryPage';
import Exams from './pages/Exams';
import Announcements from './pages/Announcements';
import Documents from './pages/Documents';
import Chat from './pages/Chat';
import Placements from './pages/Placements';
import Transport from './pages/Transport';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './auth/AuthContext';
import AdminStudents from './pages/AdminStudents';

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="min-h-screen grid place-items-center text-neutral-500">Loading…</div>}>
        <Routes>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/reset" element={<ResetPassword />} />

          <Route element={<AppShell />}>  
            <Route path="/" element={<Dashboard />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/timetable" element={<TimeTable />} />
            <Route path="/marks" element={<Marks />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/placements" element={<Placements />} />
            <Route path="/transport" element={<Transport />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}


