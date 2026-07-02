import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Overview() {
  const { userData } = useAuth();

  const stats = [
    { name: 'Total Locations', stat: '12', icon: Activity, color: 'bg-blue-50', text: 'text-blue-600' },
    { name: 'Cleaners Active', stat: '45', icon: Users, color: 'bg-emerald-50', text: 'text-emerald-600' },
    { name: 'SLA Compliance', stat: '98.2%', icon: CheckCircle, color: 'bg-primary-50', text: 'text-primary-600' },
    { name: 'Open Issues', stat: '3', icon: AlertTriangle, color: 'bg-rose-50', text: 'text-rose-600' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {userData?.name}. Here is what's happening today.
        </p>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((item) => (
          <motion.div variants={itemAnim} key={item.name} className="bg-white overflow-hidden rounded-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3.5 rounded-full ${item.color} ${item.text}`}>
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{item.stat}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Additional charts will go here in Phase 3 */}
      <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics (Coming Soon)</h2>
        <div className="h-64 border border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
          <span className="text-gray-500 font-medium">Charts will be populated in Phase 3</span>
        </div>
      </div>
    </div>
  );
}
