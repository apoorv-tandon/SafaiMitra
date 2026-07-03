import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, MapPin, Camera, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Assignments() {
  const { userData } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Resolve Modal State
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData?.uid && userData?.tenantId) {
      fetchAssignments();
    }
  }, [userData]);

  const fetchAssignments = async () => {
    try {
      // Fetch locations first for resolving names
      const locQ = query(collection(db, 'locations'), where('tenantId', '==', userData?.tenantId));
      const locSnap = await getDocs(locQ);
      const locMap: Record<string, string> = {};
      locSnap.forEach(doc => {
        locMap[doc.id] = doc.data().name;
      });
      setLocations(locMap);

      // Fetch assignments
      const q = query(
        collection(db, 'customer_feedback'),
        where('tenantId', '==', userData?.tenantId),
        where('assignedCleanerId', '==', userData?.uid)
      );
      
      const snap = await getDocs(q);
      const fetched: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'resolved') {
          fetched.push({ id: doc.id, ...data });
        }
      });
      
      fetched.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setAssignments(fetched);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleResolve = async () => {
    if (!resolvingId) return;
    if (!photo) {
      setError('A photo is required as proof of cleaning.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Upload photo to Firebase Storage
      const storageRef = ref(storage, `proofs/${userData?.tenantId}/${resolvingId}/${photo.name}`);
      await uploadBytes(storageRef, photo);
      const photoUrl = await getDownloadURL(storageRef);

      // 2. Update Firestore document
      const docRef = doc(db, 'customer_feedback', resolvingId);
      await updateDoc(docRef, {
        status: 'resolved',
        proofPhotoUrl: photoUrl,
        resolvedAt: new Date(),
      });

      // 3. Remove from local state
      setAssignments(prev => prev.filter(a => a.id !== resolvingId));
      closeModal();
    } catch (err) {
      console.error("Error resolving issue:", err);
      setError('Failed to resolve issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setResolvingId(null);
    setPhoto(null);
    setPhotoPreview(null);
    setError('');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Assignments</h1>
      
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You're all caught up!</h2>
          <p className="text-gray-500">No active assignments at the moment. Take a breather.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <motion.div 
              key={assignment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center text-primary-700 font-medium bg-primary-50 px-3 py-1 rounded-full text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {locations[assignment.locationId] || 'Unknown Location'}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    Action Required
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {assignment.issues && assignment.issues.length > 0 
                    ? assignment.issues.join(', ') 
                    : 'General Cleaning Required'}
                </h3>
                
                {assignment.comments && (
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                    "{assignment.comments}"
                  </p>
                )}
                
                <button
                  onClick={() => setResolvingId(assignment.id)}
                  className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Mark as Resolved
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      <AnimatePresence>
        {resolvingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">Resolve Issue</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-4">
                  Please upload a photo showing that the washroom has been cleaned and the issue is resolved.
                </p>

                {error && (
                  <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div 
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    photoPreview ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 bg-gray-50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    className="hidden" 
                  />
                  
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Proof preview" className="w-full h-48 object-cover rounded-lg shadow-sm" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity text-white font-medium">
                        Tap to change photo
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center">
                      <div className="h-14 w-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <Camera className="h-7 w-7 text-primary-600" />
                      </div>
                      <span className="text-primary-600 font-semibold">Take Photo</span>
                      <span className="text-xs text-gray-500 mt-1">Required</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={isSubmitting || !photo}
                    className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
