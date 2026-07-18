import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Star, MessageSquareWarning, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Feedback {
  id: string;
  rating: number;
  issues: string[];
  comments: string;
  timestamp: any;
  assignedCleanerId?: string;
  assignedCleanerName?: string;
  status?: 'pending' | 'resolved' | 'review_pending';
  proofPhotoUrl?: string;
}

interface Cleaner {
  uid: string;
  name: string;
}

export default function Feedback() {
  const { userData } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feedback' | 'submissions'>('feedback');
  
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assigningFeedback, setAssigningFeedback] = useState<Feedback | null>(null);
  const [selectedCleanerId, setSelectedCleanerId] = useState('');

  useEffect(() => {
    fetchFeedback();
    fetchCleaners();
  }, [userData]);

  const fetchCleaners = async () => {
    if (!userData?.tenantId) return;
    try {
      const q = query(
        collection(db, 'users'), 
        where('tenantId', '==', userData.tenantId), 
        where('role', '==', 'cleaner')
      );
      const querySnapshot = await getDocs(q);
      const fetched: Cleaner[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ uid: doc.id, name: doc.data().name || 'Unnamed Cleaner' });
      });
      setCleaners(fetched);
    } catch (error) {
      console.error("Error fetching cleaners:", error);
    }
  };

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

  const handleAssignCleaner = async () => {
    if (!assigningFeedback || !selectedCleanerId) return;
    const cleaner = cleaners.find(c => c.uid === selectedCleanerId);
    if (!cleaner) return;

    try {
      await updateDoc(doc(db, 'customer_feedback', assigningFeedback.id), {
        assignedCleanerId: cleaner.uid,
        assignedCleanerName: cleaner.name,
        status: 'pending'
      });
      setAssigningFeedback(null);
      setSelectedCleanerId('');
      fetchFeedback(); // Refresh the list
    } catch (error) {
      console.error("Error assigning cleaner:", error);
    }
  };

  const handleResolveIssue = async (feedbackId: string) => {
    try {
      await updateDoc(doc(db, 'customer_feedback', feedbackId), {
        status: 'resolved',
        resolvedAt: new Date()
      });
      fetchFeedback(); // Refresh the list
    } catch (error) {
      console.error("Error resolving issue:", error);
    }
  };

  const handleRejectSubmission = async (feedbackId: string) => {
    try {
      await updateDoc(doc(db, 'customer_feedback', feedbackId), {
        status: 'pending',
        proofPhotoUrl: null // clear the rejected photo
      });
      fetchFeedback();
    } catch (error) {
      console.error("Error rejecting submission:", error);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await deleteDoc(doc(db, 'customer_feedback', feedbackId));
        fetchFeedback(); // Refresh the list
      } catch (error) {
        console.error("Error deleting feedback:", error);
      }
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
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`${activeTab === 'feedback' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Customer Feedback
          </button>
          <button 
            onClick={() => setActiveTab('submissions')}
            className={`${activeTab === 'submissions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Cleaner Submissions (Proofs)
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === 'feedback' ? (
          loading ? (
            <div className="py-10 text-center text-gray-500">Loading feedback...</div>
          ) : feedbacks.filter(f => !f.isScheduled && !f.issues?.some(i => i.startsWith('Routine Cleaning'))).length === 0 ? (
            <div className="py-10 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
              No feedback received yet.
            </div>
          ) : (
            feedbacks.filter(f => !f.isScheduled && !f.issues?.some(i => i.startsWith('Routine Cleaning'))).map((item) => (
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
                  
                  {item.status === 'review_pending' && (
                    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <span className="text-sm font-medium text-blue-800 flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Cleaner has submitted proof for review
                      </span>
                    </div>
                  )}
                  
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
                  
                  {/* Assignment and Status Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      {item.status === 'resolved' ? (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Resolved
                          </span>
                          <button
                            onClick={() => handleDeleteFeedback(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                            title="Delete Feedback"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : item.assignedCleanerId ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Assigned to: {item.assignedCleanerName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending Assignment
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-3">
                      {item.status !== 'resolved' && item.assignedCleanerId && (
                        <button
                          onClick={() => handleResolveIssue(item.id)}
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                        >
                          Mark as Resolved
                        </button>
                      )}
                      {item.status !== 'resolved' && !item.assignedCleanerId && (
                        <button
                          onClick={() => setAssigningFeedback(item)}
                          className="inline-flex items-center justify-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-full text-primary-600 bg-white hover:bg-primary-50 shadow-sm transition-colors"
                        >
                          Assign Cleaner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          feedbacks.filter(f => f.status === 'review_pending').length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
              <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">No proofs submitted yet</p>
              <p className="mt-1">When cleaners submit photos of completed tasks, they will appear here for your review.</p>
            </div>
          ) : (
            feedbacks.filter(f => f.status === 'review_pending').map(item => (
              <div key={item.id} className="bg-white shadow-sm overflow-hidden sm:rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Review Submission
                      </h3>
                      <p className="text-sm text-gray-500">
                        Assigned to: <span className="font-medium text-gray-900">{item.assignedCleanerName}</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Pending Review
                    </span>
                  </div>
                  
                  {item.issues && item.issues.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Original Issues:</p>
                      <div className="flex gap-2 flex-wrap">
                        {item.issues.map(issue => (
                          <span key={issue} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.proofPhotoUrl && (
                    <div className="mt-4 mb-6">
                      <p className="text-sm font-medium text-gray-700 mb-2">Proof of Cleaning:</p>
                      <div className="rounded-lg overflow-hidden border border-gray-200 inline-block max-w-md w-full">
                        <img 
                          src={item.proofPhotoUrl} 
                          alt="Proof submitted by cleaner" 
                          className="w-full h-auto object-cover max-h-96"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4">
                    <button
                      onClick={() => handleResolveIssue(item.id)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                    >
                      Approve & Mark Resolved
                    </button>
                    <button
                      onClick={() => handleRejectSubmission(item.id)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-red-200 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 shadow-sm transition-colors"
                    >
                      Reject (Re-assign)
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Assign Cleaner Modal */}
      {assigningFeedback && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setAssigningFeedback(null)}></div>
            <div className="inline-block transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Assign Cleaner to Issue
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Cleaner</label>
                <select
                  value={selectedCleanerId}
                  onChange={(e) => setSelectedCleanerId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                >
                  <option value="" disabled>Select a cleaner...</option>
                  {cleaners.map(c => (
                    <option key={c.uid} value={c.uid}>{c.name}</option>
                  ))}
                </select>
                {cleaners.length === 0 && (
                  <p className="mt-2 text-xs text-red-500">No cleaners found. Please add a cleaner in the Cleaners tab first.</p>
                )}
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleAssignCleaner}
                  disabled={!selectedCleanerId}
                  className="inline-flex w-full justify-center rounded-full border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50 transition-colors"
                >
                  Confirm Assignment
                </button>
                <button
                  type="button"
                  onClick={() => setAssigningFeedback(null)}
                  className="mt-3 inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
