import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Bell, Menu, MessageSquareWarning, Image, UserCheck, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  type: 'new_feedback' | 'proof_submitted' | 'assigned';
  title: string;
  description: string;
  timestamp: any;
  isNew: boolean;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { logout, userData, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastReadTime, setLastReadTime] = useState<number>(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const prevCountRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load last read timestamp from localStorage
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`safaimitra_lastRead_${user.uid}`);
      if (stored) setLastReadTime(parseInt(stored));
    }
  }, [user]);

  useEffect(() => {
    if (!userData?.tenantId) return;

    const q = query(
      collection(db, 'customer_feedback'),
      where('tenantId', '==', userData.tenantId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched: Notification[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.status === 'resolved') return;

        const ts = data.timestamp?.toMillis() || 0;
        const isNew = ts > lastReadTime;

        if (data.status === 'review_pending') {
          fetched.push({
            id: d.id,
            type: 'proof_submitted',
            title: 'Proof submitted for review',
            description: `${data.assignedCleanerName || 'A cleaner'} submitted proof`,
            timestamp: data.submittedAt || data.timestamp,
            isNew
          });
        } else if (data.assignedCleanerId && data.status === 'pending') {
          fetched.push({
            id: d.id,
            type: 'assigned',
            title: 'Task assigned',
            description: `Assigned to ${data.assignedCleanerName || 'a cleaner'}`,
            timestamp: data.timestamp,
            isNew
          });
        } else if (!data.assignedCleanerId) {
          fetched.push({
            id: d.id,
            type: 'new_feedback',
            title: data.issues?.[0] || 'New Feedback',
            description: data.comments || 'Customer reported an issue',
            timestamp: data.timestamp,
            isNew
          });
        }
      });

      fetched.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      
      // Show toast if new notifications appeared
      const newCount = fetched.filter(n => n.isNew).length;
      if (newCount > prevCountRef.current && prevCountRef.current !== 0) {
        setToastMessage(`${newCount} new notification${newCount > 1 ? 's' : ''}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
      prevCountRef.current = newCount;

      setNotifications(fetched.slice(0, 8));
    });

    return () => unsubscribe();
  }, [userData, lastReadTime]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    const now = Date.now();
    setLastReadTime(now);
    if (user?.uid) {
      localStorage.setItem(`safaimitra_lastRead_${user.uid}`, now.toString());
    }
    setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
  };

  const handleNotificationClick = (notif: Notification) => {
    setShowNotifications(false);
    if (notif.type === 'proof_submitted') {
      navigate('/dashboard/feedback');
    } else {
      navigate('/dashboard/feedback');
    }
  };

  const getNotifStyle = (type: string) => {
    switch (type) {
      case 'new_feedback': return { bg: 'bg-red-100', text: 'text-red-600', icon: MessageSquareWarning };
      case 'proof_submitted': return { bg: 'bg-blue-100', text: 'text-blue-600', icon: Image };
      case 'assigned': return { bg: 'bg-green-100', text: 'text-green-600', icon: UserCheck };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: Bell };
    }
  };

  const newCount = notifications.filter(n => n.isNew).length;

  return (
    <>
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
              {newCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white"
                >
                  {newCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -right-16 sm:right-0 mt-2 w-72 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {newCount > 0 && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {newCount} New
                        </span>
                      )}
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark read
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        You're all caught up! No pending issues.
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const style = getNotifStyle(notif.type);
                        const Icon = style.icon;
                        return (
                          <div 
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3 ${notif.isNew ? 'bg-blue-50/40' : ''}`}
                          >
                            <div className={`${style.bg} p-2 rounded-full flex-shrink-0 mt-0.5`}>
                              <Icon className={`h-4 w-4 ${style.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                                {notif.isNew && (
                                  <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notif.description}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {notif.timestamp?.toDate ? new Date(notif.timestamp.toDate()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div 
                      onClick={() => { setShowNotifications(false); navigate('/dashboard/feedback'); }}
                      className="px-4 py-2.5 bg-gray-50 text-center text-sm font-medium text-primary-600 cursor-pointer hover:text-primary-800 border-t border-gray-100 transition-colors"
                    >
                      View all feedback →
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

      {/* Toast notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[100] bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2"
          >
            <Bell className="h-4 w-4 text-yellow-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
