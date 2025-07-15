import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

export const InvoiceContext = createContext();

export const InvoiceProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query invoices for the current user
    const q = query(
      collection(db, 'users', user.uid, 'invoices'),
      where('status', '!=', 'deleted') // Exclude deleted invoices
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          createdAt: docData.createdAt?.toDate() || new Date(),
          updatedAt: docData.updatedAt?.toDate() || new Date(),
          dueDate: docData.dueDate || null,
          totalAmount: docData.totalAmount || docData.total || 0,
          customerName: docData.customer?.name || docData.customerName || 'Unknown',
        };
      });
      
      // Sort by creation date (newest first)
      data.sort((a, b) => b.createdAt - a.createdAt);
      
      setInvoices(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching invoices:', err);
      setError(err.message);
      setLoading(false);
      toast.error('Failed to load invoices');
    });

    return unsubscribe;
  }, [user]);

  const addInvoice = useCallback(async (invoice) => {
    if (!user) return;
    
    try {
      const invoiceData = {
        ...invoice,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: invoice.status || 'draft',
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceData);
      toast.success('Invoice created successfully');
      return docRef.id;
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.message);
      toast.error('Failed to create invoice');
      throw err;
    }
  }, [user]);

  const updateInvoice = useCallback(async (id, updates) => {
    if (!user) return;
    
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, 'users', user.uid, 'invoices', id), updateData);
      toast.success('Invoice updated successfully');
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError(err.message);
      toast.error('Failed to update invoice');
      throw err;
    }
  }, [user]);

  const deleteInvoice = useCallback(async (id) => {
    if (!user) return;
    
    try {
      // Soft delete by updating status
      await updateDoc(doc(db, 'users', user.uid, 'invoices', id), {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Invoice deleted successfully');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError(err.message);
      toast.error('Failed to delete invoice');
      throw err;
    }
  }, [user]);

  const fetchInvoices = useCallback(() => {
    // This is handled by the real-time listener, but kept for compatibility
    if (!user) return;
    // The onSnapshot listener handles real-time updates
  }, [user]);

  const value = { 
    invoices, 
    loading, 
    error, 
    addInvoice, 
    updateInvoice, 
    deleteInvoice, 
    fetchInvoices,
    setError, // Allow components to clear errors
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
};