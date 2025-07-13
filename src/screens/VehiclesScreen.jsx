import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function VehiclesScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    owner: '',
    lastService: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const vehiclesRef = collection(db, 'users', user.uid, 'vehicles');
      const q = query(vehiclesRef);
      const querySnapshot = await getDocs(q);
      const vehicleList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVehicles(vehicleList);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles');
      toast.error('Error loading vehicles');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingVehicle) {
        const vehicleRef = doc(db, 'users', user.uid, 'vehicles', editingVehicle.id);
        await updateDoc(vehicleRef, formData);
        toast.success('Vehicle updated');
      } else {
        const vehiclesRef = collection(db, 'users', user.uid, 'vehicles');
        await addDoc(vehiclesRef, formData);
        toast.success('Vehicle added');
      }
      setShowForm(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      toast.error('Failed to save vehicle');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const vehicleRef = doc(db, 'users', user.uid, 'vehicles', id);
      await deleteDoc(vehicleRef);
      toast.success('Vehicle deleted');
      fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      toast.error('Failed to delete vehicle');
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.make.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.vin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicles</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Vehicle</button>
      </div>

      <input
        type="text"
        placeholder="Search by make, model, or VIN..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-4 border rounded dark:bg-gray-800 dark:text-white"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Make</th>
              <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Model</th>
              <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Year</th>
              <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">VIN</th>
              <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Owner</th>
              <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Last Service</th>
              <th className="px-4 py-2 border text-left text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 border text-gray-900 dark:text-white">{vehicle.make}</td>
                <td className="px-4 py-2 border text-gray-900 dark:text-white">{vehicle.model}</td>
                <td className="px-4 py-2 border text-gray-900 dark:text-white">{vehicle.year}</td>
                <td className="px-4 py-2 border text-gray-900 dark:text-white">{vehicle.vin}</td>
                <td className="px-4 py-2 border text-gray-900 dark:text-white">{vehicle.owner}</td>
                <td className="px-4 py-2 border text-gray-900 dark:text-white">{vehicle.lastService}</td>
                <td className="px-4 py-2 border">
                  <button onClick={() => { setEditingVehicle(vehicle); setFormData(vehicle); setShowForm(true); }} className="text-blue-600 dark:text-blue-400 mr-2">Edit</button>
                  <button onClick={() => handleDelete(vehicle.id)} className="text-red-600 dark:text-red-400 mr-2">Delete</button>
                  <button onClick={() => navigate(`/vehicles/${vehicle.id}/service-records`)} className="text-green-600 dark:text-green-400">Records</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="make" value={formData.make} onChange={handleInputChange} placeholder="Make" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" required />
              <input name="model" value={formData.model} onChange={handleInputChange} placeholder="Model" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" required />
              <input name="year" type="number" value={formData.year} onChange={handleInputChange} placeholder="Year" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" required />
              <input name="vin" value={formData.vin} onChange={handleInputChange} placeholder="VIN" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" required />
              <input name="owner" value={formData.owner} onChange={handleInputChange} placeholder="Owner" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" required />
              <input name="lastService" type="date" value={formData.lastService} onChange={handleInputChange} placeholder="Last Service" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingVehicle(null); }} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}