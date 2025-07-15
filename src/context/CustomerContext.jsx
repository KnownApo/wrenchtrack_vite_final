import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

export const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query customers for the current user
    const q = query(
      collection(db, 'users', user.uid, 'customers'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAt: docData.createdAt?.toDate() || new Date(),
          updatedAt: docData.updatedAt?.toDate() || new Date(),
        };
      });
      
      setCustomers(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching customers:', err);
      setError(err.message);
      setLoading(false);
      toast.error('Failed to load customers');
    });

    return unsubscribe;
  }, [user]);

  const addCustomer = useCallback(async (customer) => {
    if (!user) return;
    
    try {
      const customerData = {
        ...customer,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: customer.status || 'active',
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'customers'), customerData);
      toast.success('Customer added successfully');
      return docRef.id;
    } catch (err) {
      console.error('Error adding customer:', err);
      setError(err.message);
      toast.error('Failed to add customer');
      throw err;
    }
  }, [user]);

  const updateCustomer = useCallback(async (id, updates) => {
    if (!user) return;
    
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, 'users', user.uid, 'customers', id), updateData);
      toast.success('Customer updated successfully');
    } catch (err) {
      console.error('Error updating customer:', err);
      setError(err.message);
      toast.error('Failed to update customer');
      throw err;
    }
  }, [user]);

  const deleteCustomer = useCallback(async (id) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'customers', id));
      toast.success('Customer deleted successfully');
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err.message);
      toast.error('Failed to delete customer');
      throw err;
    }
  }, [user]);

  const getCustomerStats = useCallback(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const recentCustomers = customers.filter(c => {
      const createdAt = c.createdAt;
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return createdAt >= monthAgo;
    }).length;

    return {
      totalCustomers,
      activeCustomers,
      recentCustomers,
      inactiveCustomers: totalCustomers - activeCustomers,
    };
  }, [customers]);

  const value = {
    customers,
    loading,
    error,
    setError,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerStats,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
