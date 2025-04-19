import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

// Create the context
const InvoiceContext = createContext();

// Create a provider component
export function InvoiceProvider({ children }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Function to load invoices
  const loadInvoices = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('InvoiceContext: Loading invoices...');
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const invoiceSnapshot = await getDocs(invoicesRef);
      
      let invoiceList = [];
      invoiceSnapshot.forEach(doc => {
        const data = doc.data();
        invoiceList.push({
          id: doc.id,
          ...data,
          paidAmount: typeof data.paidAmount !== 'undefined' ? parseFloat(data.paidAmount) : 0
        });
      });
      
      // Sort by date (most recent first)
      invoiceList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setInvoices(invoiceList);
      console.log('InvoiceContext: Loaded', invoiceList.length, 'invoices');
    } catch (error) {
      console.error('Error loading invoices in context:', error);
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
    if (user) {
      loadInvoices();
    }
  }, [user, lastUpdate]);

  // The value to be provided to consumers
  const value = {
    invoices,
    setInvoices,
    loading,
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