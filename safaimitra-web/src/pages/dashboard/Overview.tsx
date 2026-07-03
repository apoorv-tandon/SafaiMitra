import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

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

  const [feedbackTrend, setFeedbackTrend] = useState<{ date: string; count: number }[]>([]);
  const [topIssues, setTopIssues] = useState<{ name: string; count: number }[]>([]);
  const [resolutionStatus, setResolutionStatus] = useState<{ name: string; value: number }[]>([]);

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

  useEffect(() => {
    fetchChartData();
  }, [userData]);

  const CHART_COLORS = {
    primary: '#0ea5e9', // sky-500
    cyan: '#06b6d4',
    amber: '#F59E0B',
    blue: '#3B82F6',
    red: '#EF4444',
  };

  const PIE_COLORS = [CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.cyan];

  const fetchChartData = async () => {
    if (!userData?.tenantId) return;
    try {
      const feedbackQuery = query(
        collection(db, 'customer_feedback'),
        where('tenantId', '==', userData.tenantId)
      );
      const feedbackSnap = await getDocs(feedbackQuery);

      // --- Feedback Trend (last 7 days) ---
      const now = new Date();
      const dayMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayMap[key] = 0;
      }
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // --- Top Issues & Resolution Status ---
      const issueCount: Record<string, number> = {};
      let pendingCount = 0;
      let reviewPendingCount = 0;
      let resolvedCount = 0;

      feedbackSnap.forEach((docSnap) => {
        const data = docSnap.data();

        // Trend
        if (data.timestamp) {
          const ts = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          if (ts >= sevenDaysAgo) {
            const key = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dayMap[key] !== undefined) {
              dayMap[key]++;
            }
          }
        }

        // Issues
        if (data.issues && Array.isArray(data.issues)) {
          data.issues.forEach((issue: string) => {
            issueCount[issue] = (issueCount[issue] || 0) + 1;
          });
        }

        // Resolution
        if (data.status === 'resolved') resolvedCount++;
        else if (data.status === 'review_pending') reviewPendingCount++;
        else pendingCount++;
      });

      setFeedbackTrend(Object.entries(dayMap).map(([date, count]) => ({ date, count })));

      const sortedIssues = Object.entries(issueCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setTopIssues(sortedIssues);

      setResolutionStatus([
        { name: 'Pending', value: pendingCount },
        { name: 'Review Pending', value: reviewPendingCount },
        { name: 'Resolved', value: resolvedCount },
      ]);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const stats = [
    { name: 'Total Locations', stat: totalLocations.toString(), icon: Activity, color: 'bg-blue-50', text: 'text-blue-600' },
    { name: 'Cleaners Active', stat: activeCleaners.toString(), icon: Users, color: 'bg-cyan-50', text: 'text-cyan-600' },
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
      
      {/* Performance Charts */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feedback Trend - Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feedback Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={feedbackTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4 }} name="Feedback" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Issues - Horizontal Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Issues</h2>
          {topIssues.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-gray-400">No issues reported yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topIssues} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.blue} radius={[0, 4, 4, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resolution Status - Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2 lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resolution Status</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={resolutionStatus}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {resolutionStatus.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
