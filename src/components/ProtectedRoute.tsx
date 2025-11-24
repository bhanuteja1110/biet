import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: ('student' | 'teacher' | 'admin')[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'teacher') {
      return <Navigate to="/teacher" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

