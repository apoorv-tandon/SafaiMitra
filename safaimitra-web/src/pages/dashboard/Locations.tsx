import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface Location {
  id: string;
  name: string;
  address: string;
  createdAt: any;
}

export default function Locations() {
  const { userData } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [userData]);

  const fetchLocations = async () => {
    if (!userData?.tenantId) return;
    try {
      const q = query(collection(db, 'locations'), where('tenantId', '==', userData.tenantId));
      const querySnapshot = await getDocs(q);
      const locs: Location[] = [];
      querySnapshot.forEach((doc) => {
        locs.push({ id: doc.id, ...doc.data() } as Location);
      });
      setLocations(locs);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.tenantId) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'locations', editingId), {
          name: newLocation.name,
          address: newLocation.address,
        });
      } else {
        await addDoc(collection(db, 'locations'), {
          name: newLocation.name,
          address: newLocation.address,
          tenantId: userData.tenantId,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setNewLocation({ name: '', address: '' });
      fetchLocations();
    } catch (error) {
      console.error("Error saving location:", error);
    }
  };

  const openEditModal = (location: Location) => {
    setEditingId(location.id);
    setNewLocation({ name: location.name, address: location.address });
    setIsModalOpen(true);
  };

  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'locations', id));
        fetchLocations();
      } catch (error) {
        console.error("Error deleting location:", error);
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
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all facilities and washroom locations under your organization.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingId(null);
              setNewLocation({ name: '', address: '' });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </button>
        </div>
      </div>

      {/* Locations List */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden border border-gray-200 md:rounded-xl bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="py-4 pl-4 pr-3 text-left text-sm font-semibold text-gray-600 sm:pl-6">Name</th>
                    <th className="px-3 py-4 text-left text-sm font-semibold text-gray-600">Address</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-sm text-gray-500">Loading locations...</td>
                    </tr>
                  ) : locations.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-sm text-gray-500">No locations found. Add one to get started.</td>
                    </tr>
                  ) : (
                    locations.map((location) => (
                      <tr key={location.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center">
                              <MapPin className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{location.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{location.address}</td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button onClick={() => openEditModal(location)} className="text-primary-600 hover:text-primary-900 mr-4">Edit</button>
                          <button onClick={() => handleDeleteLocation(location.id)} className="text-rose-600 hover:text-rose-900">Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mt-3 text-center sm:mt-5 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {editingId ? 'Edit Location' : 'Add New Location'}
                  </h3>
                  <div className="mt-2">
                    <form onSubmit={handleSaveLocation} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location Name</label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                          value={newLocation.name}
                          onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                          rows={3}
                          value={newLocation.address}
                          onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                        ></textarea>
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
    </motion.div>
  );
}
