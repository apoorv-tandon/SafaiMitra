import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Star, MessageSquareWarning, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Feedback {
  id: string;
  rating: number;
  issues: string[];
  comments: string;
  timestamp: any;
}

export default function Feedback() {
  const { userData } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, [userData]);

  const fetchFeedback = async () => {
    if (!userData?.tenantId) return;
    try {
      const q = query(
        collection(db, 'customer_feedback'),
        where('tenantId', '==', userData.tenantId),
        // orderBy requires an index if mixed with where. Removing orderBy for dummy setup unless index exists.
        // orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetched: Feedback[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Feedback);
      });
      // Sort in memory to avoid needing complex composite index if not yet deployed
      fetched.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setFeedbacks(fetched);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Customer Feedback & Submissions</h1>
        <p className="mt-2 text-sm text-gray-700">
          Review customer ratings, complaints, and cleaner proof submissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button className="border-primary-500 text-primary-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
            Customer Feedback
          </button>
          <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
            Cleaner Submissions (Proofs)
          </button>
        </nav>
      </div>

      {/* Feedback List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading feedback...</div>
        ) : feedbacks.length === 0 ? (
          <div className="py-10 text-center text-gray-500 bg-white rounded-lg shadow border border-gray-200">
            No feedback received yet.
          </div>
        ) : (
          feedbacks.map((item) => (
            <div key={item.id} className="bg-white shadow-sm overflow-hidden sm:rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex">{renderStars(item.rating)}</div>
                    <span className="text-sm font-medium text-gray-900 ml-2">
                      {item.rating <= 2 ? 'Needs Attention' : 'Good'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.timestamp ? new Date(item.timestamp.toDate()).toLocaleDateString() : 'Unknown date'}
                  </div>
                </div>
                
                {item.issues && item.issues.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {item.issues.map(issue => (
                      <span key={issue} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <MessageSquareWarning className="h-3 w-3 mr-1" />
                        {issue}
                      </span>
                    ))}
                  </div>
                )}
                
                {item.comments && (
                  <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    "{item.comments}"
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
