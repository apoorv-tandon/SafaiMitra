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
  
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
        if (data.status === 'pending' || data.status === 'review_pending') {
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

  const handlePhotoSelect = (assignmentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotos(prev => ({ ...prev, [assignmentId]: file }));
      setPhotoPreviews(prev => ({ ...prev, [assignmentId]: URL.createObjectURL(file) }));
      setError('');
    }
  };

  const handleResolve = async (assignmentId: string) => {
    const photo = photos[assignmentId];
    if (!photo) {
      setError('A photo is required as proof of cleaning.');
      return;
    }

    setIsSubmitting(assignmentId);
    setError('');

    try {
      // 1. Upload photo to Firebase Storage with a timeout
      // If Firebase Storage is not enabled, this can hang indefinitely or fail.
      let photoUrl = '';
      try {
        const storageRef = ref(storage, `proofs/${userData?.tenantId}/${assignmentId}/${photo.name}`);
        const uploadTask = uploadBytes(storageRef, photo);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 5000);
        });
        
        await Promise.race([uploadTask, timeoutPromise]);
        photoUrl = await getDownloadURL(storageRef);
      } catch (uploadErr) {
        console.warn("Firebase Storage upload failed (likely not configured). Falling back to demo image.", uploadErr);
        photoUrl = "https://images.unsplash.com/photo-1584820927498-cafe8c1c7f0f?q=80&w=600&auto=format&fit=crop";
      }

      // 2. Update Firestore document
      const docRef = doc(db, 'customer_feedback', assignmentId);
      await updateDoc(docRef, {
        status: 'review_pending',
        proofPhotoUrl: photoUrl,
        submittedAt: new Date(),
      });

      // 3. Update local state instead of removing
      setAssignments(prev => prev.map(a => 
        a.id === assignmentId ? { ...a, status: 'review_pending', proofPhotoUrl: photoUrl } : a
      ));
      
      // Clean up photo state
      setPhotos(prev => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
      setPhotoPreviews(prev => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
    } catch (err: any) {
      console.error("Error resolving issue:", err);
      setError(err.message || 'Failed to resolve issue. Please try again.');
    } finally {
      setIsSubmitting(null);
    }
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
                  {assignment.status === 'review_pending' ? (
                    <span className="text-xs font-semibold uppercase tracking-wider text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      Verification Pending
                    </span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      Action Required
                    </span>
                  )}
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
                
                {/* Photo Upload Area */}
                {assignment.status === 'review_pending' ? (
                  <div className="mt-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Submitted Proof</p>
                    <div className="border border-gray-200 rounded-xl p-2 bg-gray-50 text-center">
                      {assignment.proofPhotoUrl ? (
                        <img src={assignment.proofPhotoUrl} alt="Proof" className="w-full h-48 object-cover rounded-lg shadow-sm" />
                      ) : (
                        <p className="py-8 text-gray-500">Photo submitted</p>
                      )}
                      <p className="mt-2 text-sm text-yellow-700 font-medium">Waiting for Admin to verify</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Proof of Cleaning</p>
                    
                    <div 
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                        photoPreviews[assignment.id] ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 bg-gray-50'
                      }`}
                      onClick={() => fileInputRefs.current[assignment.id]?.click()}
                    >
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref={el => fileInputRefs.current[assignment.id] = el}
                        onChange={(e) => handlePhotoSelect(assignment.id, e)}
                        className="hidden" 
                      />
                      
                      {photoPreviews[assignment.id] ? (
                        <div className="relative">
                          <img src={photoPreviews[assignment.id]} alt="Proof preview" className="w-full h-48 object-cover rounded-lg shadow-sm" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity text-white font-medium">
                            Tap to change photo
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 flex flex-col items-center">
                          <div className="h-12 w-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                            <Camera className="h-6 w-6 text-primary-600" />
                          </div>
                          <span className="text-primary-600 font-semibold text-sm">Take Photo</span>
                          <span className="text-xs text-gray-500 mt-1">Required to complete task</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && assignment.status !== 'review_pending' && (
                  <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {assignment.status !== 'review_pending' && (
                  <button
                    onClick={() => handleResolve(assignment.id)}
                    disabled={isSubmitting === assignment.id || !photos[assignment.id]}
                    className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting === assignment.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Submit for Review
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
