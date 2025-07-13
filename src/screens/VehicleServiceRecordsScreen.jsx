import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, doc, setDoc, getDocs, query, where, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { FiSearch, FiPlusCircle, FiTrash2, FiEdit, FiChevronDown, FiChevronUp } from 'react-icons/fi';

export default function VehicleServiceRecordsScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
    // Form states
  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: '',
    mileage: '',
    description: '',
    technician: '',
    partsUsed: '',
    cost: '',
    recommendations: '',
  });
  
  // Vehicle form states
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    year: '',
    make: '',
    model: '',
    vin: '',
    licensePlate: '',
    color: '',  });

  const { user } = useAuth();

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const q = query(collection(db, 'users', user.uid, 'customers'));
        const querySnapshot = await getDocs(q);
        const fetchedCustomers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCustomers(fetchedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [user]);

  // Fetch vehicles when customer is selected
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!selectedCustomer) {
        setVehicles([]);
        return;
      }
      
      setLoading(true);
      try {
        const q = query(collection(db, 'users', user.uid, 'vehicles'), where('customerId', '==', selectedCustomer.id));
        const querySnapshot = await getDocs(q);
        const fetchedVehicles = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVehicles(fetchedVehicles);
        setSelectedVehicle(null);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [selectedCustomer, user]);

  // Fetch service records when vehicle is selected
  useEffect(() => {
    const fetchServiceRecords = async () => {
      if (!selectedVehicle) {
        setServiceRecords([]);
        return;
      }
      
      setLoading(true);
      try {
        const q = query(collection(db, 'users', user.uid, 'serviceRecords'), 
          where('vehicleId', '==', selectedVehicle.id));
        
        const querySnapshot = await getDocs(q);
        const fetchedRecords = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          serviceDate: doc.data().serviceDate?.toDate() || new Date()
        })).sort((a, b) => b.serviceDate - a.serviceDate);
        
        setServiceRecords(fetchedRecords);
      } catch (error) {
        console.error('Error fetching service records:', error);
        toast.error('Failed to load service history');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceRecords();
  }, [selectedVehicle, user]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    `${customer.firstName} ${customer.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    
    if (!selectedVehicle) {
      toast.error('Please select a vehicle');
      return;
    }
    
    setLoading(true);
    try {
      const newRecord = {
        vehicleId: selectedVehicle.id,
        customerId: selectedCustomer.id,
        serviceDate: Timestamp.fromDate(new Date(formData.serviceDate)),
        serviceType: formData.serviceType,
        mileage: parseInt(formData.mileage) || 0,
        description: formData.description,
        technician: formData.technician,
        partsUsed: formData.partsUsed,
        cost: parseFloat(formData.cost) || 0,
        recommendations: formData.recommendations,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'users', user.uid, 'serviceRecords'), newRecord);
      
      toast.success('Service record added successfully');
      setShowAddForm(false);
      
      // Reset form
      setFormData({
        serviceDate: new Date().toISOString().split('T')[0],
        serviceType: '',
        mileage: '',
        description: '',
        technician: '',
        partsUsed: '',
        cost: '',
        recommendations: '',
      });
      
      // Refresh service records
      const q = query(collection(db, 'users', user.uid, 'serviceRecords'), 
        where('vehicleId', '==', selectedVehicle.id));
      
      const querySnapshot = await getDocs(q);
      const fetchedRecords = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        serviceDate: doc.data().serviceDate?.toDate() || new Date()
      })).sort((a, b) => b.serviceDate - a.serviceDate);
      
      setServiceRecords(fetchedRecords);
      
    } catch (error) {
      console.error('Error adding service record:', error);
      toast.error('Failed to add service record');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this service record?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'serviceRecords', recordId));
      setServiceRecords(prev => prev.filter(record => record.id !== recordId));
      toast.success('Service record deleted successfully');
    } catch (error) {
      console.error('Error deleting service record:', error);
      toast.error('Failed to delete service record');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVehicleInputChange = (e) => {
    const { name, value } = e.target;
    setVehicleFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }
    
    setLoading(true);
    try {
      const newVehicle = {
        customerId: selectedCustomer.id,
        year: vehicleFormData.year,
        make: vehicleFormData.make,
        model: vehicleFormData.model,
        vin: vehicleFormData.vin,
        licensePlate: vehicleFormData.licensePlate,
        color: vehicleFormData.color,
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'vehicles'), newVehicle);
      
      // Add the new vehicle to the local state with its id
      const vehicleWithId = {
        id: docRef.id,
        ...newVehicle
      };
      
      setVehicles(prev => [...prev, vehicleWithId]);
      setSelectedVehicle(vehicleWithId);
      setShowAddVehicleForm(false);
      
      // Reset form
      setVehicleFormData({
        year: '',
        make: '',
        model: '',
        vin: '',
        licensePlate: '',
        color: ''
      });
      
      toast.success('Vehicle added successfully');
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Vehicle Service Records</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Selection Panel */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Select Customer</h2>
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading && !customers.length ? (
                <div className="py-4 text-center text-gray-500">Loading customers...</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredCustomers.map(customer => (
                    <li 
                      key={customer.id}
                      className={`py-3 px-2 cursor-pointer hover:bg-blue-50 rounded transition ${
                        selectedCustomer?.id === customer.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                      <div className="text-sm text-gray-600">{customer.phone || customer.email}</div>
                    </li>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <li className="py-4 text-center text-gray-500">
                      No customers found
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
            {/* Vehicle Selection Panel */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select Vehicle</h2>
              {selectedCustomer && (
                <button
                  onClick={() => setShowAddVehicleForm(!showAddVehicleForm)}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  <FiPlusCircle /> {showAddVehicleForm ? 'Cancel' : 'Add Vehicle'}
                </button>
              )}
            </div>
            {!selectedCustomer ? (
              <div className="py-12 text-center text-gray-500">
                Please select a customer first
              </div>
            ) : (
              <>
                <div className="text-sm text-blue-600 mb-3">
                  Selected customer: {selectedCustomer.firstName} {selectedCustomer.lastName}
                </div>
                
                {/* Add Vehicle Form */}
                {showAddVehicleForm && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-sm mb-3">Add New Vehicle</h3>
                    <form onSubmit={handleAddVehicle} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Year*</label>
                          <input 
                            type="text" 
                            name="year" 
                            value={vehicleFormData.year}
                            onChange={handleVehicleInputChange}
                            placeholder="e.g. 2023"
                            required
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Make*</label>
                          <input 
                            type="text" 
                            name="make" 
                            value={vehicleFormData.make}
                            onChange={handleVehicleInputChange}
                            placeholder="e.g. Honda"
                            required
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Model*</label>
                        <input 
                          type="text" 
                          name="model" 
                          value={vehicleFormData.model}
                          onChange={handleVehicleInputChange}
                          placeholder="e.g. Civic"
                          required
                          className="w-full p-2 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">VIN</label>
                        <input 
                          type="text" 
                          name="vin" 
                          value={vehicleFormData.vin}
                          onChange={handleVehicleInputChange}
                          placeholder="Vehicle Identification Number"
                          className="w-full p-2 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">License Plate</label>
                          <input 
                            type="text" 
                            name="licensePlate" 
                            value={vehicleFormData.licensePlate}
                            onChange={handleVehicleInputChange}
                            placeholder="License Plate"
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                          <input 
                            type="text" 
                            name="color" 
                            value={vehicleFormData.color}
                            onChange={handleVehicleInputChange}
                            placeholder="Vehicle Color"
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                        >
                          {loading ? 'Adding...' : 'Add Vehicle'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                <div className="max-h-96 overflow-y-auto">
                  {loading && !vehicles.length ? (
                    <div className="py-4 text-center text-gray-500">Loading vehicles...</div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {vehicles.map(vehicle => (
                        <li 
                          key={vehicle.id}
                          className={`py-3 px-2 cursor-pointer hover:bg-blue-50 rounded transition ${
                            selectedVehicle?.id === vehicle.id ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => setSelectedVehicle(vehicle)}
                        >
                          <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                          <div className="text-sm text-gray-600">
                            {vehicle.licensePlate && <span>License: {vehicle.licensePlate} • </span>}
                            {vehicle.vin ? `VIN: ${vehicle.vin}` : ''} 
                            {vehicle.color && <span> • {vehicle.color}</span>}
                          </div>
                        </li>
                      ))}
                      {vehicles.length === 0 && !showAddVehicleForm && (
                        <li className="py-4 text-center text-gray-500">
                          No vehicles found for this customer
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Service Records Panel */}
          <div className="bg-white rounded-xl shadow-md p-6 lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Service History</h2>
              {selectedVehicle && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                >
                  <FiPlusCircle /> {showAddForm ? 'Cancel' : 'Add Service Record'}
                </button>
              )}
            </div>
            
            {!selectedVehicle ? (
              <div className="py-12 text-center text-gray-500">
                Please select a vehicle to view service history
              </div>
            ) : (
              <>
                <div className="text-sm text-blue-600 mb-3">
                  Vehicle: {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} 
                  {selectedVehicle.licensePlate ? ` • License: ${selectedVehicle.licensePlate}` : ''}
                </div>
                
                {/* Add Record Form */}
                {showAddForm && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h3 className="font-medium text-lg mb-3">Add New Service Record</h3>
                    <form onSubmit={handleAddRecord}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
                          <input 
                            type="date" 
                            name="serviceDate" 
                            value={formData.serviceDate}
                            onChange={handleInputChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                          <select 
                            name="serviceType" 
                            value={formData.serviceType}
                            onChange={handleInputChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select service type</option>
                            <option value="Oil Change">Oil Change</option>
                            <option value="Tire Rotation">Tire Rotation</option>
                            <option value="Brake Service">Brake Service</option>
                            <option value="Engine Repair">Engine Repair</option>
                            <option value="Transmission">Transmission</option>
                            <option value="Electrical">Electrical</option>
                            <option value="AC/Heating">AC/Heating</option>
                            <option value="Diagnostic">Diagnostic</option>
                            <option value="Scheduled Maintenance">Scheduled Maintenance</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                          <input 
                            type="number" 
                            name="mileage" 
                            value={formData.mileage}
                            onChange={handleInputChange}
                            placeholder="Vehicle mileage"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                          <input 
                            type="number" 
                            name="cost" 
                            value={formData.cost}
                            onChange={handleInputChange}
                            placeholder="Service cost"
                            step="0.01"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                          <input 
                            type="text" 
                            name="technician" 
                            value={formData.technician}
                            onChange={handleInputChange}
                            placeholder="Technician name"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Parts Used</label>
                          <input 
                            type="text" 
                            name="partsUsed" 
                            value={formData.partsUsed}
                            onChange={handleInputChange}
                            placeholder="Parts used for service"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Description</label>
                          <textarea 
                            name="description" 
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Describe the service performed"
                            required
                            rows="2"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          ></textarea>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                          <textarea 
                            name="recommendations" 
                            value={formData.recommendations}
                            onChange={handleInputChange}
                            placeholder="Future service recommendations"
                            rows="2"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          ></textarea>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={loading}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : 'Save Record'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* Service Records List */}
                {loading && !serviceRecords.length ? (
                  <div className="py-8 text-center text-gray-500">Loading service records...</div>
                ) : serviceRecords.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No service records found for this vehicle
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mileage
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cost
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {serviceRecords.map(record => (
                          <RecordRow key={record.id} record={record} onDelete={handleDeleteRecord} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Record Row Component with expandable details
function RecordRow({ record, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          {record.serviceDate instanceof Date 
            ? record.serviceDate.toLocaleDateString() 
            : new Date(record.serviceDate).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            {record.serviceType}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {record.mileage ? `${record.mileage.toLocaleString()} mi` : 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {record.cost ? `$${record.cost.toFixed(2)}` : 'N/A'}
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900 line-clamp-1">{record.description}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-900"
            >
              {expanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            <button 
              onClick={() => onDelete(record.id)}
              className="text-red-600 hover:text-red-900"
            >
              <FiTrash2 />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan="6" className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Technician</p>
                <p className="text-sm">{record.technician || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Parts Used</p>
                <p className="text-sm">{record.partsUsed || 'None recorded'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500">Service Description</p>
                <p className="text-sm">{record.description}</p>
              </div>
              {record.recommendations && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500">Recommendations</p>
                  <p className="text-sm">{record.recommendations}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
