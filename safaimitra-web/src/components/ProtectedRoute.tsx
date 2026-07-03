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

  // If user is logged in but user document is not found in Firestore
  if (user && !userData) {
     return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 max-w-md w-full">
           <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 mb-4">
             <span className="text-rose-600 text-xl font-bold">!</span>
           </div>
           <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
           <p className="text-gray-600 mb-6">
             Your Google account is not registered as an administrator in our system. Please contact your organization owner for access.
           </p>
           <button 
             onClick={() => logout()}
             className="w-full inline-flex justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
           >
             Sign Out
           </button>
         </div>
      </div>
    );
  }

  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    // If they are a cleaner trying to access admin, send them to cleaner app
    if (userData.role === 'cleaner') {
      return <Navigate to="/cleaner" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // If there are no allowed roles specified (e.g. standard dashboard) but the user is a cleaner, redirect them.
  if (!allowedRoles && userData?.role === 'cleaner') {
    return <Navigate to="/cleaner" replace />;
  }

  return <>{children}</>;
};
