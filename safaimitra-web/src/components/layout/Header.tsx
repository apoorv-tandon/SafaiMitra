import React from 'react';
import { LogOut, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { logout, userData } = useAuth();

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
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="text-gray-400 hover:text-gray-500 relative"
        >
          <span className="sr-only">View notifications</span>
          <Bell className="h-6 w-6" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
        </motion.button>
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
