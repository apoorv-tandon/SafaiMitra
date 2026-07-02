import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Bell, Menu, MessageSquareWarning } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { logout, userData } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData?.tenantId) return;

    const q = query(
      collection(db, 'customer_feedback'),
      where('tenantId', '==', userData.tenantId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'resolved') {
          fetched.push({ id: doc.id, ...data });
        }
      });
      fetched.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setNotifications(fetched.slice(0, 5));
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [userData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(false);
    navigate('/dashboard/feedback');
  };

  return (
    <header className="bg-white h-16 flex items-center justify-between px-6 border-b border-gray-200 z-10 sticky top-0">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="mr-4 md:hidden text-gray-500 hover:text-gray-700"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative" ref={dropdownRef}>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-gray-400 hover:text-gray-500 relative p-1 focus:outline-none"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {notifications.length}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    {notifications.length} New
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      You're all caught up! No pending issues.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={handleNotificationClick}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3"
                      >
                        <div className="bg-red-100 p-2 rounded-full flex-shrink-0 mt-0.5">
                          <MessageSquareWarning className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {notif.issues && notif.issues.length > 0 ? notif.issues[0] : 'New Feedback'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {notif.comments || 'No comments provided.'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notif.timestamp ? new Date(notif.timestamp.toDate()).toLocaleDateString() : 'Unknown time'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div 
                    onClick={handleNotificationClick}
                    className="px-4 py-2 bg-gray-50 text-center text-sm font-medium text-primary-600 cursor-pointer hover:text-primary-800 border-t border-gray-100"
                  >
                    View all feedback
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="h-6 w-px bg-gray-200 mx-2"></div>
        <motion.button 
          whileHover={{ x: 2 }}
          onClick={logout}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign out
        </motion.button>
      </div>
    </header>
  );
}
