import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemAnim: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Overview() {
  const { userData } = useAuth();
  
  const [totalLocations, setTotalLocations] = useState(0);
  const [activeCleaners, setActiveCleaners] = useState(0);
  const [openIssues, setOpenIssues] = useState(0);
  const [slaCompliance, setSlaCompliance] = useState(100);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.tenantId) return;

      try {
        // Fetch locations count
        const locationsQuery = query(collection(db, 'locations'), where('tenantId', '==', userData.tenantId));
        const locationsSnap = await getDocs(locationsQuery);
        setTotalLocations(locationsSnap.size);

        // Fetch cleaners count
        const cleanersQuery = query(collection(db, 'users'), where('tenantId', '==', userData.tenantId), where('role', '==', 'cleaner'));
        const cleanersSnap = await getDocs(cleanersQuery);
        setActiveCleaners(cleanersSnap.size);

        // Fetch feedback for issues count & SLA
        const feedbackQuery = query(collection(db, 'customer_feedback'), where('tenantId', '==', userData.tenantId));
        const feedbackSnap = await getDocs(feedbackQuery);
        
        let openCount = 0;
        let resolvedCount = 0;
        
        feedbackSnap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'resolved') {
            resolvedCount++;
          } else {
            openCount++;
          }
        });
        
        setOpenIssues(openCount);
        
        const totalIssues = openCount + resolvedCount;
        if (totalIssues > 0) {
          setSlaCompliance(Math.round((resolvedCount / totalIssues) * 1000) / 10);
        } else {
          setSlaCompliance(100);
        }

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchDashboardData();
  }, [userData]);

  const stats = [
    { name: 'Total Locations', stat: totalLocations.toString(), icon: Activity, color: 'bg-blue-50', text: 'text-blue-600' },
    { name: 'Cleaners Active', stat: activeCleaners.toString(), icon: Users, color: 'bg-emerald-50', text: 'text-emerald-600' },
    { name: 'SLA Compliance', stat: `${slaCompliance}%`, icon: CheckCircle, color: 'bg-primary-50', text: 'text-primary-600' },
    { name: 'Open Issues', stat: openIssues.toString(), icon: AlertTriangle, color: 'bg-rose-50', text: 'text-rose-600' },
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
