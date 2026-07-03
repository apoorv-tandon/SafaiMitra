import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, ShieldCheck, Bell, ClipboardList, ListTodo, MessageSquareWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function CleanerLayout() {
  const { logout, userData, user, loading } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time notifications for cleaner: new assignments, rejections, approvals
  useEffect(() => {
    if (!userData?.tenantId || !user?.uid) return;

    const q = query(
      collection(db, 'customer_feedback'),
      where('tenantId', '==', userData.tenantId),
      where('assignedCleanerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.status === 'pending' && !data.proofPhotoUrl) {
          fetched.push({ id: d.id, type: 'new_task', message: 'New task assigned to you', timestamp: data.timestamp });
        }
      });
      fetched.sort((a: any, b: any) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      setNotifications(fetched.slice(0, 5));
    });

    return () => unsubscribe();
  }, [userData, user]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const isTasksActive = location.pathname === '/cleaner' || location.pathname === '/cleaner/';
  const isHistoryActive = location.pathname === '/cleaner/history';

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

          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-500 hover:text-gray-700 relative"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {notifications.length}
                </span>
              )}
            </motion.button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
                >
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">No new notifications</div>
                    ) : (
                      notifications.map((n: any) => (
                        <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-3 hover:bg-gray-50">
                          <div className="bg-amber-100 p-1.5 rounded-full shrink-0 mt-0.5">
                            <MessageSquareWarning className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {n.timestamp?.toDate ? new Date(n.timestamp.toDate()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
      <main className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto p-4 md:p-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex">
          <Link
            to="/cleaner"
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              isTasksActive ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <ListTodo className={`h-5 w-5 mb-1 ${isTasksActive ? 'text-primary-600' : 'text-gray-400'}`} />
            My Tasks
            {isTasksActive && <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary-600 rounded-full" />}
          </Link>
          <Link
            to="/cleaner/history"
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              isHistoryActive ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <ClipboardList className={`h-5 w-5 mb-1 ${isHistoryActive ? 'text-primary-600' : 'text-gray-400'}`} />
            History
            {isHistoryActive && <div className="absolute top-0 left-3/4 right-0 h-0.5 bg-primary-600 rounded-full" />}
          </Link>
        </div>
      </nav>
    </div>
  );
}
