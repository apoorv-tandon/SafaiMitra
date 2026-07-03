import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Trash2, Clock, MapPin, User } from 'lucide-react';

interface ScheduleEntry {
  id: string;
  locationId: string;
  locationName: string;
  cleanerId: string;
  cleanerName: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
  timeSlot: string; // e.g. '09:00', '14:00'
  type: 'one-time' | 'recurring';
  createdAt: any;
}

interface Cleaner {
  uid: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Grid displays Mon–Sun (indices 1,2,3,4,5,6,0)
const GRID_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Schedule() {
  const { userData } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    locationId: '',
    cleanerId: '',
    dayOfWeek: 1,
    timeSlot: '09:00',
    type: 'recurring' as 'one-time' | 'recurring',
  });

  useEffect(() => {
    if (userData?.tenantId) {
      fetchAll();
    }
  }, [userData]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSchedules(), fetchCleaners(), fetchLocations()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    if (!userData?.tenantId) return;
    try {
      const q = query(
        collection(db, 'schedules'),
        where('tenantId', '==', userData.tenantId)
      );
      const snap = await getDocs(q);
      const fetched: ScheduleEntry[] = [];
      snap.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as ScheduleEntry);
      });
      fetched.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
      setSchedules(fetched);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchCleaners = async () => {
    if (!userData?.tenantId) return;
    try {
      const q = query(
        collection(db, 'users'),
        where('tenantId', '==', userData.tenantId),
        where('role', '==', 'cleaner')
      );
      const snap = await getDocs(q);
      const fetched: Cleaner[] = [];
      snap.forEach((d) => {
        fetched.push({ uid: d.id, name: d.data().name || 'Unnamed Cleaner' });
      });
      setCleaners(fetched);
    } catch (error) {
      console.error('Error fetching cleaners:', error);
    }
  };

  const fetchLocations = async () => {
    if (!userData?.tenantId) return;
    try {
      const q = query(
        collection(db, 'locations'),
        where('tenantId', '==', userData.tenantId)
      );
      const snap = await getDocs(q);
      const fetched: Location[] = [];
      snap.forEach((d) => {
        fetched.push({ id: d.id, name: d.data().name || 'Unnamed Location' });
      });
      setLocations(fetched);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.tenantId) return;

    const location = locations.find((l) => l.id === formData.locationId);
    const cleaner = cleaners.find((c) => c.uid === formData.cleanerId);
    if (!location || !cleaner) return;

    try {
      await addDoc(collection(db, 'schedules'), {
        locationId: formData.locationId,
        locationName: location.name,
        cleanerId: formData.cleanerId,
        cleanerName: cleaner.name,
        dayOfWeek: formData.dayOfWeek,
        timeSlot: formData.timeSlot,
        type: formData.type,
        tenantId: userData.tenantId,
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setFormData({ locationId: '', cleanerId: '', dayOfWeek: 1, timeSlot: '09:00', type: 'recurring' });
      fetchSchedules();
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await deleteDoc(doc(db, 'schedules', id));
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const getSchedulesForDay = (day: number) => {
    return schedules.filter((s) => s.dayOfWeek === day);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage cleaning schedules across all locations and assign cleaners to time slots.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setFormData({ locationId: '', cleanerId: '', dayOfWeek: 1, timeSlot: '09:00', type: 'recurring' });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading schedules...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {GRID_ORDER.map((dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Day Header */}
                <div className="bg-gray-50/80 px-3 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 text-center">
                    <span className="hidden md:inline">{DAYS_SHORT[dayIndex]}</span>
                    <span className="md:hidden">{DAYS_OF_WEEK[dayIndex]}</span>
                  </h3>
                </div>

                {/* Tasks */}
                <div className="p-2 space-y-2 min-h-[120px]">
                  <AnimatePresence>
                    {getSchedulesForDay(dayIndex).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No tasks</p>
                    ) : (
                      getSchedulesForDay(dayIndex).map((entry) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`rounded-lg p-2.5 border text-xs ${
                            entry.type === 'recurring'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="inline-flex items-center font-semibold text-gray-800">
                              <Clock className="h-3 w-3 mr-1 text-gray-500" />
                              {entry.timeSlot}
                            </span>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-0.5 text-gray-400 hover:text-rose-600 transition-colors"
                              title="Delete schedule"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center text-gray-600 mb-1">
                            <MapPin className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">{entry.locationName}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <User className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">{entry.cleanerName}</span>
                          </div>
                          <div className="mt-1.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                entry.type === 'recurring'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {entry.type === 'recurring' ? 'Recurring' : 'One-time'}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-100 border border-blue-200" />
          Recurring
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-100 border border-green-200" />
          One-time
        </div>
      </div>

      {/* Add Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            ></div>
            <div className="inline-block transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                Add Schedule Entry
              </h3>
              <form onSubmit={handleAddSchedule} className="space-y-4">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    required
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                  >
                    <option value="" disabled>
                      Select a location...
                    </option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {locations.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">No locations found. Add one in the Locations tab first.</p>
                  )}
                </div>

                {/* Cleaner */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cleaner</label>
                  <select
                    required
                    value={formData.cleanerId}
                    onChange={(e) => setFormData({ ...formData, cleanerId: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                  >
                    <option value="" disabled>
                      Select a cleaner...
                    </option>
                    {cleaners.map((c) => (
                      <option key={c.uid} value={c.uid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {cleaners.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">No cleaners found. Add one in the Cleaners tab first.</p>
                  )}
                </div>

                {/* Day of Week */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                  >
                    {DAYS_OF_WEEK.map((day, i) => (
                      <option key={i} value={i}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                  <input
                    type="time"
                    required
                    value={formData.timeSlot}
                    onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  />
                </div>

                {/* Type Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'recurring' })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        formData.type === 'recurring'
                          ? 'bg-blue-50 text-blue-700 border-r border-blue-200'
                          : 'bg-white text-gray-500 border-r border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Recurring
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'one-time' })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        formData.type === 'one-time'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      One-time
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={!formData.locationId || !formData.cleanerId}
                    className="inline-flex w-full justify-center rounded-full border border-transparent bg-primary-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50 transition-colors"
                  >
                    Save Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
