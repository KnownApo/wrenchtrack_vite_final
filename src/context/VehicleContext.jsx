import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

export const VehicleContext = createContext();

export const VehicleProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setServiceRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let vehiclesLoaded = false;
    let serviceRecordsLoaded = false;
    
    const checkLoadingComplete = () => {
      if (vehiclesLoaded && serviceRecordsLoaded) {
        setLoading(false);
      }
    };

    // Query vehicles for the current user
    const vehiclesQuery = query(
      collection(db, 'users', user.uid, 'vehicles'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAt: docData.createdAt?.toDate() || new Date(),
          updatedAt: docData.updatedAt?.toDate() || new Date(),
        };
      });
      
      setVehicles(data);
      vehiclesLoaded = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Error fetching vehicles:', err);
      setError(err.message);
      vehiclesLoaded = true;
      checkLoadingComplete();
      toast.error('Failed to load vehicles');
    });

    // Query service records for the current user
    const serviceQuery = query(
      collection(db, 'users', user.uid, 'serviceRecords'),
      orderBy('serviceDate', 'desc')
    );

    const unsubscribeService = onSnapshot(serviceQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          serviceDate: docData.serviceDate?.toDate() || new Date(),
          createdAt: docData.createdAt?.toDate() || new Date(),
          updatedAt: docData.updatedAt?.toDate() || new Date(),
        };
      });
      
      setServiceRecords(data);
      serviceRecordsLoaded = true;
      checkLoadingComplete();
    }, (err) => {
      console.error('Error fetching service records:', err);
      setError(err.message);
      serviceRecordsLoaded = true;
      checkLoadingComplete();
      toast.error('Failed to load service records');
    });

    return () => {
      unsubscribeVehicles();
      unsubscribeService();
    };
  }, [user]);

  const addVehicle = useCallback(async (vehicle) => {
    if (!user) return;
    
    try {
      const vehicleData = {
        ...vehicle,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: vehicle.status || 'active',
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'vehicles'), vehicleData);
      toast.success('Vehicle added successfully');
      return docRef.id;
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err.message);
      toast.error('Failed to add vehicle');
      throw err;
    }
  }, [user]);

  const updateVehicle = useCallback(async (id, updates) => {
    if (!user) return;
    
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, 'users', user.uid, 'vehicles', id), updateData);
      toast.success('Vehicle updated successfully');
    } catch (err) {
      console.error('Error updating vehicle:', err);
      setError(err.message);
      toast.error('Failed to update vehicle');
      throw err;
    }
  }, [user]);

  const deleteVehicle = useCallback(async (id) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'vehicles', id));
      toast.success('Vehicle deleted successfully');
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError(err.message);
      toast.error('Failed to delete vehicle');
      throw err;
    }
  }, [user]);

  const addServiceRecord = useCallback(async (serviceRecord) => {
    if (!user) return;
    
    try {
      const serviceData = {
        ...serviceRecord,
        userId: user.uid,
        serviceDate: serviceRecord.serviceDate ? new Date(serviceRecord.serviceDate) : new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'serviceRecords'), serviceData);
      toast.success('Service record added successfully');
      return docRef.id;
    } catch (err) {
      console.error('Error adding service record:', err);
      setError(err.message);
      toast.error('Failed to add service record');
      throw err;
    }
  }, [user]);

  const updateServiceRecord = useCallback(async (id, updates) => {
    if (!user) return;
    
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      if (updates.serviceDate) {
        updateData.serviceDate = new Date(updates.serviceDate);
      }
      
      await updateDoc(doc(db, 'users', user.uid, 'serviceRecords', id), updateData);
      toast.success('Service record updated successfully');
    } catch (err) {
      console.error('Error updating service record:', err);
      setError(err.message);
      toast.error('Failed to update service record');
      throw err;
    }
  }, [user]);

  const deleteServiceRecord = useCallback(async (id) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'serviceRecords', id));
      toast.success('Service record deleted successfully');
    } catch (err) {
      console.error('Error deleting service record:', err);
      setError(err.message);
      toast.error('Failed to delete service record');
      throw err;
    }
  }, [user]);

  const getVehiclesByCustomer = useCallback((customerId) => {
    return vehicles.filter(vehicle => vehicle.customerId === customerId);
  }, [vehicles]);

  const getServiceRecordsByVehicle = useCallback((vehicleId) => {
    return serviceRecords.filter(record => record.vehicleId === vehicleId);
  }, [serviceRecords]);

  const getVehicleStats = useCallback(() => {
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const totalServiceRecords = serviceRecords.length;
    const recentServices = serviceRecords.filter(record => {
      const serviceDate = record.serviceDate;
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return serviceDate >= monthAgo;
    }).length;

    const totalServiceCost = serviceRecords.reduce((sum, record) => 
      sum + (parseFloat(record.cost) || 0), 0
    );

    return {
      totalVehicles,
      activeVehicles,
      totalServiceRecords,
      recentServices,
      totalServiceCost,
      inactiveVehicles: totalVehicles - activeVehicles,
    };
  }, [vehicles, serviceRecords]);

  const value = {
    vehicles,
    serviceRecords,
    loading,
    error,
    setError,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addServiceRecord,
    updateServiceRecord,
    deleteServiceRecord,
    getVehiclesByCustomer,
    getServiceRecordsByVehicle,
    getVehicleStats,
  };

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicles must be used within a VehicleProvider');
  }
  return context;
};
