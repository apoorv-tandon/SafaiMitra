import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  MessageSquare, 
  Settings,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const location = useLocation();
  const { userData } = useAuth();

  const isAdmin = userData?.role === 'super_admin' || userData?.role === 'org_admin';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Locations & Washrooms', path: '/dashboard/locations', icon: MapPin },
    { name: 'Cleaners', path: '/dashboard/cleaners', icon: Users },
    { name: 'Schedule', path: '/dashboard/schedule', icon: Calendar },
    { name: 'Feedback & Submissions', path: '/dashboard/feedback', icon: MessageSquare },
    { name: 'History', path: '/dashboard/history', icon: ClipboardList },
  ];

  if (userData?.role === 'super_admin') {
    navItems.push({ name: 'Organizations', path: '/dashboard/organizations', icon: Settings });
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col w-64 bg-white text-gray-700 h-full border-r border-gray-200`}>
      <Link to="/" className="flex items-center h-16 px-6 border-b border-gray-200 hover:bg-gray-50 transition-colors">
        <img src="/logo.png" alt="SafaiMitra Logo" className="h-8 w-8 mr-3 object-contain" />
        <span className="text-xl font-bold text-gray-900 tracking-tight">SafaiMitra</span>
      </Link>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/dashboard' 
              ? location.pathname === '/dashboard'
              : (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-full transition-colors duration-200 ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-700' : 'text-gray-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 border-t border-gray-200"
      >
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
            {userData?.name?.charAt(0) || 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{userData?.role.replace('_', ' ')}</p>
          </div>
        </div>
      </motion.div>
    </div>
    </>
  );
}
