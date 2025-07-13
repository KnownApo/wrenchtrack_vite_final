import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext'; // Assuming this is the correct path; adjust if needed
import { toast } from 'react-toastify';

// Create the context
const InvoiceContext = createContext();

// Provider component
export function InvoiceProvider({ children }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null); // For in-progress editing
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load invoices in real-time using onSnapshot
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const invoicesRef = collection(db, 'users', user.uid, 'invoices');
    const unsubscribe = onSnapshot(invoicesRef, (snapshot) => {
      let invoiceList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        invoiceList.push({
          id: docSnap.id,
          ...data,
          paidAmount: typeof data.paidAmount !== 'undefined' ? parseFloat(data.paidAmount) : 0,
          createdAt: data.createdAt?.toDate() || new Date(data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toDate() || new Date(data.updatedAt || Date.now()),
        });
      });

      // Sort by updatedAt descending
      invoiceList.sort((a, b) => b.updatedAt - a.updatedAt);
      setInvoices(invoiceList);
      setLoading(false);
    }, (err) => {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices in real-time.');
      toast.error('Invoice sync failed. Please refresh.');
      setLoading(false);
    });

    return unsubscribe; // Cleanup listener
  }, [user]);

  // Persist currentInvoice to localStorage for session recovery
  useEffect(() => {
    const saved = localStorage.getItem('currentInvoice');
    if (saved) setCurrentInvoice(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (currentInvoice) {
      localStorage.setItem('currentInvoice', JSON.stringify(currentInvoice));
    } else {
      localStorage.removeItem('currentInvoice');
    }
  }, [currentInvoice]);

  // Create a new invoice
  const createInvoice = useCallback(async (invoiceData) => {
    if (!user) return;
    try {
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const newDoc = await addDoc(invoicesRef, {
        ...invoiceData,
        items: invoiceData.items || [], // Ensure items array
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'draft',
      });
      toast.success('Invoice created successfully');
      setCurrentInvoice({ id: newDoc.id, ...invoiceData }); // Set as current
      return newDoc.id;
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast.error('Failed to create invoice');
    }
  }, [user]);

  // Update an existing invoice
  const updateInvoice = useCallback(async (invoiceId, updates) => {
    if (!user || !invoiceId) return;
    try {
      const invoiceRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      toast.success('Invoice updated successfully');
      if (currentInvoice?.id === invoiceId) {
        setCurrentInvoice((prev) => ({ ...prev, ...updates }));
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast.error('Failed to update invoice');
    }
  }, [user, currentInvoice]);

  // Delete an invoice (soft delete by updating status)
  const deleteInvoice = useCallback(async (invoiceId) => {
    if (!user || !invoiceId) return;
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await updateInvoice(invoiceId, { status: 'deleted', deletedAt: serverTimestamp() });
      toast.success('Invoice deleted successfully');
      if (currentInvoice?.id === invoiceId) setCurrentInvoice(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast.error('Failed to delete invoice');
    }
  }, [user, updateInvoice, currentInvoice]);

  // Add item (e.g., part or labor) to invoice
  const addItemToInvoice = useCallback(async (invoiceId, item) => {
    if (!user || !invoiceId || !item) return;
    try {
      const invoice = invoices.find((inv) => inv.id === invoiceId) || currentInvoice;
      if (!invoice) throw new Error('Invoice not found');
      
      const updatedItems = [...(invoice.items || []), {
        ...item,
        quantity: item.quantity || 1,
        price: item.cost || item.price || 0,
        total: (item.quantity || 1) * (item.cost || item.price || 0),
      }];

      const updatedTotal = updatedItems.reduce((sum, it) => sum + it.total, 0);

      await updateInvoice(invoiceId, {
        items: updatedItems,
        totalAmount: updatedTotal,
      });

      toast.success(`${item.name || 'Item'} added to invoice`);
    } catch (err) {
      console.error('Error adding item to invoice:', err);
      toast.error('Failed to add item');
    }
  }, [user, invoices, currentInvoice, updateInvoice]);

  // Remove item from invoice
  const removeItemFromInvoice = useCallback(async (invoiceId, itemIndex) => {
    if (!user || !invoiceId) return;
    try {
      const invoice = invoices.find((inv) => inv.id === invoiceId) || currentInvoice;
      if (!invoice) throw new Error('Invoice not found');
      
      const updatedItems = invoice.items.filter((_, idx) => idx !== itemIndex);
      const updatedTotal = updatedItems.reduce((sum, it) => sum + it.total, 0);

      await updateInvoice(invoiceId, {
        items: updatedItems,
        totalAmount: updatedTotal,
      });

      toast.success('Item removed from invoice');
    } catch (err) {
      console.error('Error removing item:', err);
      toast.error('Failed to remove item');
    }
  }, [user, invoices, currentInvoice, updateInvoice]);

  // Memoized value to prevent re-renders
  const value = useMemo(() => ({
    invoices,
    currentInvoice,
    setCurrentInvoice,
    loading,
    error,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    addItemToInvoice,
    removeItemFromInvoice,
  }), [invoices, currentInvoice, loading, error, createInvoice, updateInvoice, deleteInvoice, addItemToInvoice, removeItemFromInvoice]);

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
}

// Custom hook
export function useInvoice() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
}