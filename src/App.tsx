import { Route, Routes, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider } from './auth/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
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
// Teacher pages
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherMarks from './pages/teacher/Marks';

// Admin pages
import AdminStudents from './pages/admin/Students';
import AdminAttendance from './pages/admin/Attendance';
import AdminAssignments from './pages/admin/Assignments';
import AdminMarks from './pages/admin/Marks';
import AdminTeachers from './pages/admin/Teachers';
import AdminClasses from './pages/admin/Classes';
import AdminTimeTable from './pages/admin/TimeTable';
import Initialize from './pages/admin/Initialize';

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="min-h-screen grid place-items-center text-neutral-500">Loading…</div>}>
        <Routes>
          {/* Auth routes - accessible without authentication */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/reset" element={<ResetPassword />} />

          {/* Protected routes - require authentication */}
          <Route element={<AppShell />}>  
            {/* Student Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/settings" element={<Settings />} />

            {/* Teacher Routes - Protected */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAttendance /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAssignments /></ProtectedRoute>} />
            <Route path="/teacher/marks" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherMarks /></ProtectedRoute>} />

            {/* Admin Routes - Protected */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeachers /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['admin']}><AdminClasses /></ProtectedRoute>} />
            <Route path="/admin/timetable" element={<ProtectedRoute allowedRoles={['admin']}><AdminTimeTable /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/assignments" element={<ProtectedRoute allowedRoles={['admin']}><AdminAssignments /></ProtectedRoute>} />
            <Route path="/admin/marks" element={<ProtectedRoute allowedRoles={['admin']}><AdminMarks /></ProtectedRoute>} />
            <Route path="/admin/initialize" element={<ProtectedRoute allowedRoles={['admin']}><Initialize /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Navigate to="/auth/login" replace />} />
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
