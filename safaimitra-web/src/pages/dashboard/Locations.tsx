import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, MapPin, Search, QrCode, Download, Copy, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

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
  const [qrLocation, setQrLocation] = useState<Location | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

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

  const getQrUrl = (location: Location) =>
    `${window.location.origin}/submit-feedback?org=${userData?.tenantId}&loc=${location.id}`;

  const handleDownloadQr = () => {
    if (!qrRef.current || !qrLocation) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-${qrLocation.name.replace(/\s+/g, '-')}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyLink = () => {
    if (!qrLocation) return;
    navigator.clipboard.writeText(getQrUrl(qrLocation)).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
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
                          <button
                            onClick={() => setQrLocation(location)}
                            className="text-gray-500 hover:text-primary-600 mr-4"
                            title="Show QR Code"
                          >
                            <QrCode className="h-5 w-5 inline" />
                          </button>
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

      {/* QR Code Modal */}
      {qrLocation && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setQrLocation(null)}></div>
            <div className="inline-block transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6 sm:align-middle">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  QR Code
                </h3>
                <button
                  onClick={() => setQrLocation(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 mb-3">
                  <MapPin className="h-5 w-5 text-primary-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-1">{qrLocation.name}</h4>
                <p className="text-sm text-gray-500 mb-6">{qrLocation.address}</p>

                <div ref={qrRef} className="inline-block p-4 bg-white border-2 border-gray-100 rounded-xl mb-6">
                  <QRCodeSVG
                    value={getQrUrl(qrLocation)}
                    size={256}
                    level="H"
                    includeMargin
                  />
                </div>

                <p className="text-xs text-gray-400 mb-6 break-all px-4">
                  {getQrUrl(qrLocation)}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadQr}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copySuccess ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
