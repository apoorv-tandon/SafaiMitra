import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Cleaner {
  uid: string;
  name: string;
  email: string;
  status: string;
  imageUrl?: string;
}

export default function Cleaners() {
  const { userData } = useAuth();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCleaner, setNewCleaner] = useState({ name: '', email: '', password: '', imageUrl: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAssignmentsFor, setViewingAssignmentsFor] = useState<Cleaner | null>(null);
  const [cleanerAssignments, setCleanerAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
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
        fetched.push({ uid: doc.id, ...doc.data() } as Cleaner);
      });
      setCleaners(fetched);
    } catch (error) {
      console.error("Error fetching cleaners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewingAssignmentsFor) {
      fetchAssignments(viewingAssignmentsFor.uid);
    } else {
      setCleanerAssignments([]);
    }
  }, [viewingAssignmentsFor]);

  const fetchAssignments = async (cleanerId: string) => {
    setLoadingAssignments(true);
    try {
      const q = query(
        collection(db, 'customer_feedback'),
        where('assignedCleanerId', '==', cleanerId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      const fetched: any[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      // Sort in memory by timestamp
      fetched.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setCleanerAssignments(fetched);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSaveCleaner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.tenantId) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), {
          name: newCleaner.name,
          email: newCleaner.email,
          imageUrl: newCleaner.imageUrl,
        });
      } else {
        if (!newCleaner.password) {
          alert('Password is required for new cleaners');
          return;
        }
        
        // Create a secondary app to create the user without logging out the admin
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, newCleaner.email, newCleaner.password);
          const newUid = userCred.user.uid;
          
          await setDoc(doc(db, 'users', newUid), {
            name: newCleaner.name,
            email: newCleaner.email,
            imageUrl: newCleaner.imageUrl,
            role: 'cleaner',
            status: 'Active',
            tenantId: userData.tenantId,
            createdAt: serverTimestamp(),
          });
        } finally {
          // Always clean up the secondary app
          await deleteApp(secondaryApp);
        }
      }
      setIsModalOpen(false);
      setEditingId(null);
      setNewCleaner({ name: '', email: '', password: '', imageUrl: '' });
      fetchCleaners();
    } catch (error: any) {
      console.error("Error saving cleaner:", error);
      alert(error.message || "An error occurred");
    }
  };

  const openEditModal = (cleaner: Cleaner) => {
    setEditingId(cleaner.uid);
    setNewCleaner({ name: cleaner.name, email: cleaner.email, password: '', imageUrl: cleaner.imageUrl || '' });
    setIsModalOpen(true);
  };

  const handleDeleteCleaner = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this cleaner? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        fetchCleaners();
      } catch (error) {
        console.error("Error deleting cleaner:", error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Cleaners</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage cleaning staff, view their assignments, and track performance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingId(null);
              setNewCleaner({ name: '', email: '', password: '', imageUrl: '' });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cleaner
          </button>
        </div>
      </div>

      {/* Cleaners List */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-10 text-center text-gray-500">Loading cleaners...</div>
        ) : cleaners.length === 0 ? (
          <div className="col-span-full py-10 text-center text-gray-500">No cleaners found. Add one to get started.</div>
        ) : (
          cleaners.map((cleaner) => (
            <div key={cleaner.uid} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-all duration-200">
              <div className="p-6 flex flex-col items-center text-center">
                {cleaner.imageUrl ? (
                  <img src={cleaner.imageUrl} alt={cleaner.name} className="h-16 w-16 rounded-full object-cover mb-4 shadow-sm" />
                ) : (
                  <UserCircle className="h-16 w-16 text-gray-400 mb-4" />
                )}
                <h3 className="text-lg font-medium text-gray-900">{cleaner.name || 'Unnamed Cleaner'}</h3>
                <p className="text-sm text-gray-500">{cleaner.email}</p>
                <span className="mt-4 px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  {cleaner.status || 'Active'}
                </span>
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <div className="flex justify-between items-center w-full text-sm font-medium">
                  <button onClick={() => setViewingAssignmentsFor(cleaner)} className="text-primary-600 hover:text-primary-800">View Assignments</button>
                  <div className="flex space-x-4">
                    <button onClick={() => openEditModal(cleaner)} className="text-primary-600 hover:text-primary-800">Edit</button>
                    <button onClick={() => handleDeleteCleaner(cleaner.uid)} className="text-rose-600 hover:text-rose-800">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Cleaner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mt-3 text-center sm:mt-5 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {editingId ? 'Edit Cleaner Profile' : 'Add New Cleaner'}
                  </h3>
                  <div className="mt-2">
                    <form onSubmit={handleSaveCleaner} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                          value={newCleaner.name}
                          onChange={(e) => setNewCleaner({ ...newCleaner, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                          type="email"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                          value={newCleaner.email}
                          onChange={(e) => setNewCleaner({ ...newCleaner, email: e.target.value })}
                        />
                      </div>
                      {!editingId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Initial Password</label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                            value={newCleaner.password}
                            onChange={(e) => setNewCleaner({ ...newCleaner, password: e.target.value })}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Profile Image URL (Optional)</label>
                        <input
                          type="url"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                          placeholder="https://example.com/image.jpg"
                          value={newCleaner.imageUrl}
                          onChange={(e) => setNewCleaner({ ...newCleaner, imageUrl: e.target.value })}
                        />
                      </div>
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-full border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                          onClick={() => setIsModalOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Assignments Modal */}
      {viewingAssignmentsFor && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setViewingAssignmentsFor(null)}></div>
            <div className="inline-block transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mt-3 text-center sm:mt-5 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Assignments: {viewingAssignmentsFor.name}</h3>
                  <div className="mt-4">
                    {loadingAssignments ? (
                      <div className="py-4 text-center text-gray-500">Loading assignments...</div>
                    ) : cleanerAssignments.length === 0 ? (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
                        No active assignments found for this cleaner.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {cleanerAssignments.map(assignment => (
                          <div key={assignment.id} className="p-4 bg-white rounded-lg border border-gray-200 text-left shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-medium text-gray-500">
                                {assignment.timestamp ? new Date(assignment.timestamp.toDate()).toLocaleDateString() : 'Unknown date'}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                Pending
                              </span>
                            </div>
                            {assignment.issues && assignment.issues.length > 0 && (
                              <div className="text-sm text-gray-900 font-medium mb-1">
                                Issues: {assignment.issues.join(', ')}
                              </div>
                            )}
                            {assignment.comments && (
                              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                                "{assignment.comments}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-5 sm:mt-6">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-sm"
                      onClick={() => setViewingAssignmentsFor(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
