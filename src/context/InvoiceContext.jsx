import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

// Create the context
const InvoiceContext = createContext();

// Create a provider component
export function InvoiceProvider({ children }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Function to load invoices
  const loadInvoices = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const invoiceSnapshot = await getDocs(invoicesRef);
      
      let invoiceList = [];
      invoiceSnapshot.forEach(doc => {
        const data = doc.data();
        invoiceList.push({
          id: doc.id,
          ...data,
          paidAmount: typeof data.paidAmount !== 'undefined' ? parseFloat(data.paidAmount) : 0,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now())
        });
      });
      
      // Sort by date (most recent first)
      invoiceList.sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB - dateA;
      });
      
      setInvoices(invoiceList);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setError(error);
      toast.error('Failed to load invoices. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Force a refresh of invoice data
  const refreshInvoices = () => {
    setLastUpdate(Date.now());
  };

  // Load invoices when the user changes or lastUpdate changes
  useEffect(() => {
    loadInvoices();
  }, [user, lastUpdate]);

  const value = {
    invoices,
    setInvoices,
    loading,
    error,
    refreshInvoices,
    loadInvoices
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
}

// Custom hook to use the invoice context
export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
}