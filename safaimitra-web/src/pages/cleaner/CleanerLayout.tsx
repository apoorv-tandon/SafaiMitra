import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CleanerLayout() {
  const { logout, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (userData?.role !== 'cleaner') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <header className="bg-white h-16 flex items-center justify-between px-4 border-b border-gray-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center">
          <ShieldCheck className="h-8 w-8 text-primary-600 mr-2" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">SafaiMitra</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{userData?.role}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold shrink-0">
            {userData?.name?.charAt(0) || 'C'}
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </motion.button>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto p-4 md:p-6 pb-20">
        <Outlet />
      </main>
    </div>
  );
}
