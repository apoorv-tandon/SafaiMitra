import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'super_admin' | 'org_admin' | 'supervisor' | 'cleaner'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, userData, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is logged in but user document is still fetching or not found
  if (user && !userData) {
     return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
         <p className="text-gray-600">Loading user profile...</p>
         <button 
           onClick={() => logout()}
           className="mt-4 text-sm text-primary-600 underline"
         >
           Sign Out
         </button>
      </div>
    );
  }

  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
