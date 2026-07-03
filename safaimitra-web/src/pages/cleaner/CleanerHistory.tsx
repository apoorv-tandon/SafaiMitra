import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, Image as ImageIcon, Calendar, Trophy } from 'lucide-react';

interface CompletedTask {
  id: string;
  locationId?: string;
  issues?: string[];
  comments?: string;
  timestamp: any;
  resolvedAt: any;
  proofPhotoUrl?: string;
}

export default function CleanerHistory() {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.uid && userData?.tenantId) {
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

      // Fetch resolved tasks for this cleaner
      const q = query(
        collection(db, 'customer_feedback'),
        where('tenantId', '==', userData?.tenantId),
        where('assignedCleanerId', '==', userData?.uid),
        where('status', '==', 'resolved')
      );
      const snap = await getDocs(q);
      const fetched: CompletedTask[] = [];
      snap.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as CompletedTask);
      });
      // Sort by resolvedAt descending
      fetched.sort((a, b) => {
        const aTime = a.resolvedAt?.toMillis?.() || a.resolvedAt?.getTime?.() || 0;
        const bTime = b.resolvedAt?.toMillis?.() || b.resolvedAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      setTasks(fetched);
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResolvedDate = (item: CompletedTask): Date | null => {
    if (!item.resolvedAt) return null;
    if (item.resolvedAt.toDate) return item.resolvedAt.toDate();
    if (item.resolvedAt instanceof Date) return item.resolvedAt;
    return new Date(item.resolvedAt);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Completed Tasks</h1>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6"
      >
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-amber-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Tasks Completed</p>
            <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center"
        >
          <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No completed tasks yet</h2>
          <p className="text-gray-500">Once you resolve assigned issues, they'll appear here.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => {
            const resolvedDate = getResolvedDate(task);
            const locationName = task.locationId ? locations[task.locationId] || 'Unknown Location' : 'Unknown Location';

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-l-4 border-l-blue-400"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Blue Checkmark */}
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Location */}
                      <div className="flex items-center text-primary-700 font-medium text-sm mb-1">
                        <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <span className="truncate">{locationName}</span>
                      </div>

                      {/* Issues */}
                      {task.issues && task.issues.length > 0 && (
                        <p className="text-sm text-gray-700 mb-2">
                          {task.issues.join(', ')}
                        </p>
                      )}

                      {/* Date */}
                      <div className="flex items-center text-xs text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        {resolvedDate
                          ? resolvedDate.toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Unknown date'}
                      </div>
                    </div>

                    {/* Proof Thumbnail */}
                    {task.proofPhotoUrl ? (
                      <div className="h-14 w-14 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        <img
                          src={task.proofPhotoUrl}
                          alt="Proof"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                        <ImageIcon className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
