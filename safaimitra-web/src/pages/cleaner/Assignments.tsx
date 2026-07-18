import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, MapPin, Camera, X, Loader2, AlertCircle, Calendar } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
      fetchData();
    }
  }, [userData]);

  const fetchData = async () => {
    try {
      // 1. Fetch locations
      const locQ = query(collection(db, 'locations'), where('tenantId', '==', userData?.tenantId));
      const locSnap = await getDocs(locQ);
      const locMap: Record<string, string> = {};
      locSnap.forEach(doc => {
        locMap[doc.id] = doc.data().name;
      });
      setLocations(locMap);

      // 2. Fetch assignments (customer feedback / already submitted schedules)
      const q = query(
        collection(db, 'customer_feedback'),
        where('tenantId', '==', userData?.tenantId),
        where('assignedCleanerId', '==', userData?.uid)
      );
      
      const snap = await getDocs(q);
      const fetchedAssignments: any[] = [];
      const submittedScheduleIds = new Set<string>();
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'pending' || data.status === 'review_pending') {
          fetchedAssignments.push({ id: doc.id, ...data });
          
          // Track schedules submitted today so we don't show the duplicate "Action Required" card
          if (data.isScheduled && data.scheduleId && data.submittedAt) {
            const subDate = data.submittedAt.toDate();
            if (subDate >= todayStart) {
              submittedScheduleIds.add(data.scheduleId);
            }
          }
        }
      });
      fetchedAssignments.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());

      // 3. Fetch schedules
      const schedQ = query(
        collection(db, 'schedules'),
        where('cleanerId', '==', userData?.uid)
      );
      const schedSnap = await getDocs(schedQ);
      const fetchedSchedules: any[] = [];
      
      schedSnap.forEach(doc => {
        // Only include if it hasn't been submitted today
        if (!submittedScheduleIds.has(doc.id)) {
          fetchedSchedules.push({ id: doc.id, isSchedule: true, ...doc.data() });
        }
      });
      
      // Sort schedules by dayOfWeek then timeSlot
      fetchedSchedules.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.timeSlot.localeCompare(b.timeSlot);
      });

      // Merge and set
      setAssignments([...fetchedAssignments, ...fetchedSchedules]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (assignmentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotos(prev => ({ ...prev, [assignmentId]: file }));
      // Create local preview URL
      const url = URL.createObjectURL(file);
      setPhotoPreviews(prev => ({ ...prev, [assignmentId]: url }));
      setError('');
    }
  };

  // Compress image and return as Base64 data URL to store in Firestore directly
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.6 to keep size well under Firestore's 1MB limit
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleResolve = async (assignment: any) => {
    const assignmentId = assignment.id;
    const photo = photos[assignmentId];
    if (!photo) {
      setError('A photo is required as proof of cleaning.');
      return;
    }

    setIsSubmitting(assignmentId);
    setError('');

    try {
      // 1. Compress image to Base64 (bypasses Firebase Storage entirely)
      const base64Photo = await compressImage(photo);

      // 2. Update or Create Firestore document
      if (assignment.isSchedule) {
        // Create a new customer_feedback entry for this scheduled task
        await addDoc(collection(db, 'customer_feedback'), {
          tenantId: userData?.tenantId,
          locationId: assignment.locationId,
          issues: ['Routine Cleaning (' + assignment.timeSlot + ')'],
          assignedCleanerId: userData?.uid,
          assignedCleanerName: userData?.name,
          status: 'review_pending',
          proofPhotoUrl: base64Photo,
          submittedAt: new Date(),
          timestamp: new Date(),
          isScheduled: true,
          scheduleId: assignment.id
        });
        
        // Hide the schedule from the current view so they don't submit it twice
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      } else {
        // Update existing feedback document
        const docRef = doc(db, 'customer_feedback', assignmentId);
        await updateDoc(docRef, {
          status: 'review_pending',
          proofPhotoUrl: base64Photo,
          submittedAt: new Date(),
        });

        // Update local state instead of removing
        setAssignments(prev => prev.map(a => 
          a.id === assignmentId ? { ...a, status: 'review_pending', proofPhotoUrl: base64Photo } : a
        ));
      }
      
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
          {assignments.map(assignment => {
            const isToday = assignment.isSchedule && assignment.dayOfWeek === new Date().getDay();
            return (
            <motion.div 
              key={assignment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                assignment.isSchedule && isToday ? 'border-primary-300' : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center text-primary-700 font-medium bg-primary-50 px-3 py-1 rounded-full text-sm">
                      <MapPin className="h-4 w-4 mr-1" />
                      {locations[assignment.locationId] || assignment.locationName || 'Unknown Location'}
                    </div>
                    {assignment.isSchedule && (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {DAYS_OF_WEEK[assignment.dayOfWeek]} · {assignment.timeSlot}
                        </span>
                        {isToday && (
                          <span className="text-xs font-bold text-white bg-primary-600 px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                    )}
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
                  {assignment.isSchedule 
                    ? `Routine Cleaning`
                    : (assignment.issues && assignment.issues.length > 0 
                        ? assignment.issues.join(', ') 
                        : 'General Cleaning Required')}
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
                    onClick={() => handleResolve(assignment)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
