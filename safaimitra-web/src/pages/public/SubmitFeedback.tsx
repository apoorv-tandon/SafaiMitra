import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Send, MapPin, CheckCircle2, ChevronRight, Check, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COMMON_ISSUES = [
  'Dirty floor',
  'No soap',
  'Toilet paper empty',
  'Plumbing issue',
  'Bad odor',
  'Trash full',
  'Wet sink area',
  'Other'
];

interface Location {
  id: string;
  name: string;
}

export default function SubmitFeedback() {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('org');
  const locId = searchParams.get('loc');

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [qrAutoSelected, setQrAutoSelected] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchLocations();
    } else {
      setLoading(false);
      setError('Invalid QR Code: Missing Organization ID.');
    }
  }, [orgId]);

  const fetchLocations = async () => {
    try {
      const q = query(collection(db, 'locations'), where('tenantId', '==', orgId));
      const querySnapshot = await getDocs(q);
      const locs: Location[] = [];
      querySnapshot.forEach((doc) => {
        locs.push({ id: doc.id, name: doc.data().name });
      });
      setLocations(locs);
      
      // Auto-select if loc param matches a fetched location (QR scan)
      if (locId) {
        const matched = locs.find(l => l.id === locId);
        if (matched) {
          setSelectedLocation(matched.id);
          setQrAutoSelected(true);
        }
      }
      // Fallback: auto-select if there's only one location
      if (!locId && locs.length === 1) {
        setSelectedLocation(locs[0].id);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
      setError('Failed to load washrooms. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleIssue = (issue: string) => {
    if (selectedIssues.includes(issue)) {
      setSelectedIssues(selectedIssues.filter(i => i !== issue));
    } else {
      setSelectedIssues([...selectedIssues, issue]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!selectedLocation) {
      setError('Please select a washroom location.');
      return;
    }
    if (rating === 0) {
      setError('Please provide a star rating.');
      return;
    }
    if (rating < 5 && selectedIssues.length === 0 && !comments.trim()) {
      setError('Please select at least one issue or provide comments for a rating lower than 5.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'customer_feedback'), {
        tenantId: orgId,
        locationId: selectedLocation,
        rating: rating,
        issues: selectedIssues,
        comments: comments.trim(),
        timestamp: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center"
        >
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-8">
            Your feedback has been successfully submitted. Our cleaning staff has been notified and will address the issue shortly.
          </p>
          <Link 
            to="/login"
            className="inline-flex justify-center text-sm font-medium text-primary-600 hover:text-primary-800"
          >
            Return to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center">
             <img src="/logo.png" alt="SafaiMitra Logo" className="h-16 w-16 object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Report an Issue
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Help us maintain clean and hygienic washrooms.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200"
        >
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {!orgId ? null : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Location Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which washroom are you in? *
                </label>
                {qrAutoSelected && selectedLocation ? (
                  <div className="mt-1 flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-3">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {locations.find(l => l.id === selectedLocation)?.name}
                        </p>
                        <p className="text-xs text-primary-600">Scanned via QR code</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQrAutoSelected(false)}
                      className="text-xs font-medium text-primary-700 hover:text-primary-900 underline ml-3"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    required
                    className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg border bg-gray-50"
                  >
                    <option value="" disabled>Select a location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                )}
                {locations.length === 0 && (
                  <p className="mt-2 text-xs text-red-500">No locations found for this organization.</p>
                )}
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  How was your experience? *
                </label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          (hoveredRating || rating) >= star
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Issues Chips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What issues are you facing? (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => toggleIssue(issue)}
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                        selectedIssues.includes(issue)
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (Optional)
                </label>
                <textarea
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-lg border p-3 bg-gray-50"
                  placeholder="Describe the exact issue..."
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting || locations.length === 0}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
