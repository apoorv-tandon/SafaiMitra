import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Image as ImageIcon,
} from 'lucide-react';

interface ResolvedFeedback {
  id: string;
  locationId?: string;
  issues?: string[];
  comments?: string;
  assignedCleanerId?: string;
  assignedCleanerName?: string;
  timestamp: any;
  resolvedAt: any;
  proofPhotoUrl?: string;
  status: string;
}

type DateRange = '7' | '30' | 'all';

export default function History() {
  const { userData } = useAuth();
  const [feedbacks, setFeedbacks] = useState<ResolvedFeedback[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  useEffect(() => {
    if (userData?.tenantId) {
      fetchData();
    }
  }, [userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch locations for name mapping
      const locQ = query(collection(db, 'locations'), where('tenantId', '==', userData?.tenantId));
      const locSnap = await getDocs(locQ);
      const locMap: Record<string, string> = {};
      locSnap.forEach((d) => {
        locMap[d.id] = d.data().name;
      });
      setLocations(locMap);

      // Fetch resolved feedback
      const q = query(
        collection(db, 'customer_feedback'),
        where('tenantId', '==', userData?.tenantId),
        where('status', '==', 'resolved')
      );
      const snap = await getDocs(q);
      const fetched: ResolvedFeedback[] = [];
      snap.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as ResolvedFeedback);
      });
      // Sort by resolvedAt descending
      fetched.sort((a, b) => {
        const aTime = a.resolvedAt?.toMillis?.() || a.resolvedAt?.getTime?.() || 0;
        const bTime = b.resolvedAt?.toMillis?.() || b.resolvedAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      setFeedbacks(fetched);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResolvedDate = (item: ResolvedFeedback): Date | null => {
    if (!item.resolvedAt) return null;
    if (item.resolvedAt.toDate) return item.resolvedAt.toDate();
    if (item.resolvedAt instanceof Date) return item.resolvedAt;
    return new Date(item.resolvedAt);
  };

  const getTimestampDate = (item: ResolvedFeedback): Date | null => {
    if (!item.timestamp) return null;
    if (item.timestamp.toDate) return item.timestamp.toDate();
    if (item.timestamp instanceof Date) return item.timestamp;
    return new Date(item.timestamp);
  };

  const getResolutionTimeMs = (item: ResolvedFeedback): number | null => {
    const resolved = getResolvedDate(item);
    const created = getTimestampDate(item);
    if (!resolved || !created) return null;
    return resolved.getTime() - created.getTime();
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const filtered = useMemo(() => {
    let result = feedbacks;

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const daysAgo = parseInt(dateRange);
      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      result = result.filter((item) => {
        const d = getResolvedDate(item);
        return d && d >= cutoff;
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const locName = (item.locationId ? locations[item.locationId] : '') || '';
        const cleanerName = item.assignedCleanerName || '';
        return locName.toLowerCase().includes(term) || cleanerName.toLowerCase().includes(term);
      });
    }

    return result;
  }, [feedbacks, dateRange, searchTerm, locations]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const resolutionTimes = filtered.map(getResolutionTimeMs).filter((t): t is number => t !== null);
    const avgMs = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = feedbacks.filter((item) => {
      const d = getResolvedDate(item);
      return d && d >= weekAgo;
    }).length;

    return { total, avgResolutionTime: avgMs, thisWeek };
  }, [filtered, feedbacks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resolution History</h1>
        <p className="mt-2 text-sm text-gray-700">
          Audit trail of all resolved issues, including resolution times and proof photos.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgResolutionTime > 0 ? formatDuration(stats.avgResolutionTime) : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by location or cleaner name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading history...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No resolved issues found</p>
            <p className="mt-1 text-sm">Try adjusting your search or date range filters.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const resolvedDate = getResolvedDate(item);
            const resMs = getResolutionTimeMs(item);
            const isExpanded = expandedId === item.id;
            const locationName = item.locationId ? locations[item.locationId] || 'Unknown Location' : 'Unknown Location';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Row Summary (clickable) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full px-4 py-4 sm:px-6 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="hidden sm:flex h-9 w-9 rounded-full bg-green-100 items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-sm font-medium text-gray-900 flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400 shrink-0" />
                          {locationName}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center">
                          <User className="h-3.5 w-3.5 mr-1 text-gray-400 shrink-0" />
                          {item.assignedCleanerName || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-gray-400">
                          {resolvedDate ? resolvedDate.toLocaleDateString() : 'Unknown date'}
                        </span>
                        {resMs !== null && (
                          <span className="text-xs text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-0.5" />
                            {formatDuration(resMs)}
                          </span>
                        )}
                        {item.issues && item.issues.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {item.issues.length} issue{item.issues.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {item.proofPhotoUrl && (
                      <div className="hidden sm:block h-10 w-10 rounded-lg overflow-hidden border border-gray-200">
                        <img src={item.proofPhotoUrl} alt="Proof" className="h-full w-full object-cover" />
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 sm:px-6 border-t border-gray-100 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Details */}
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</p>
                              <div className="mt-1 flex gap-2 flex-wrap">
                                {item.issues && item.issues.length > 0 ? (
                                  item.issues.map((issue) => (
                                    <span
                                      key={issue}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                    >
                                      {issue}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-400">None reported</span>
                                )}
                              </div>
                            </div>
                            {item.comments && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</p>
                                <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                  "{item.comments}"
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Resolution Time
                              </p>
                              <p className="mt-1 text-sm text-gray-900 font-medium">
                                {resMs !== null ? formatDuration(resMs) : 'Unknown'}
                              </p>
                            </div>
                          </div>
                          {/* Proof Photo */}
                          <div>
                            {item.proofPhotoUrl ? (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                                  <ImageIcon className="h-3.5 w-3.5 mr-1" />
                                  Proof Photo
                                </p>
                                <div className="rounded-lg overflow-hidden border border-gray-200 inline-block max-w-full">
                                  <img
                                    src={item.proofPhotoUrl}
                                    alt="Proof of cleaning"
                                    className="w-full h-auto object-cover max-h-64 rounded-lg"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                <ImageIcon className="h-5 w-5 mr-2" />
                                No proof photo
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
