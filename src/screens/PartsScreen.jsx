import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-toastify';
import { CSVLink } from 'react-csv'; // Add dep: npm i react-csv
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import PartsTable from '../components/PartsTable';
import PartForm from '../components/PartForm';
import PartsAnalytics from '../components/PartsAnalytics';
// Stub for InvoiceContext integration (if context exists, import and use)
import { useInvoice } from '../context/InvoiceContext'; // Adjust if needed

export default function PartsScreen() {
  const navigate = useNavigate();
  const { addPartToInvoice } = useInvoice() || {}; // Stub; implement if context available
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!auth.currentUser) throw new Error('User not authenticated');
      const partsRef = collection(db, 'users', auth.currentUser.uid, 'parts');
      const q = query(partsRef, where('status', '!=', 'deleted'));
      const querySnapshot = await getDocs(q);
      const partsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setParts(partsData);

      const totalValue = partsData.reduce((sum, part) => sum + (part.quantity * part.cost), 0);
      const lowStock = partsData.filter(part => part.quantity < part.minStock).length;
      setAnalyticsData({ totalParts: partsData.length, totalValue, lowStock });

      if (lowStock > 0) toast.warn(`${lowStock} parts are low on stock!`);

    } catch (err) {
      console.error('Error fetching parts:', err);
      setError('Failed to load parts. Please check your connection and try again.');
      toast.error('Error loading parts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  const handleAddPart = async (partData) => {
    try {
      if (!auth.currentUser) return;
      const partsRef = collection(db, 'users', auth.currentUser.uid, 'parts');
      await addDoc(partsRef, { ...partData, createdAt: new Date(), status: 'active', stockHistory: [{ date: new Date(), change: partData.quantity, note: 'Initial stock' }] });
      toast.success('Part added successfully');
      setShowForm(false);
      fetchParts();
    } catch (err) {
      console.error('Error adding part:', err);
      toast.error('Failed to add part');
    }
  };

  const handleUpdatePart = async (id, partData, quantityChange = 0) => {
    try {
      if (!auth.currentUser) return;
      const partRef = doc(db, 'users', auth.currentUser.uid, 'parts', id);
      const updateData = { ...partData, updatedAt: new Date() };
      if (quantityChange !== 0) {
        updateData.stockHistory = [...(partData.stockHistory || []), { date: new Date(), change: quantityChange, note: 'Stock adjustment' }];
      }
      await updateDoc(partRef, updateData);
      toast.success('Part updated successfully');
      setEditingPart(null);
      fetchParts();
    } catch (err) {
      console.error('Error updating part:', err);
      toast.error('Failed to update part');
    }
  };

  const handleDeletePart = async (id) => {
    if (!window.confirm('Are you sure? This will soft-delete the part.')) return;
    try {
      if (!auth.currentUser) return;
      const partRef = doc(db, 'users', auth.currentUser.uid, 'parts', id);
      await updateDoc(partRef, { status: 'deleted', deletedAt: new Date() });
      toast.success('Part deleted successfully');
      fetchParts();
    } catch (err) {
      console.error('Error deleting part:', err);
      toast.error('Failed to delete part');
    }
  };

  const addToInvoice = (part) => {
    if (addPartToInvoice) {
      addPartToInvoice(part); // Integrate with invoice if context available
      toast.success('Part added to current invoice');
    } else {
      toast.info('Invoice integration not set up yet');
    }
  };

  const filteredParts = parts.filter(part => 
    (part.name?.toLowerCase().includes(searchTerm.toLowerCase()) || part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="p-6">
      <ErrorMessage message={error} />
      <button onClick={fetchParts} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Retry</button>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parts Inventory</h1>
        <div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded mr-2 hover:bg-blue-700">Add New Part</button>
          <CSVLink data={filteredParts} filename="parts_inventory.csv" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Export CSV</CSVLink>
        </div>
      </div>

      <input type="text" placeholder="Search by name or part number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 mb-6 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500" />

      {analyticsData && <PartsAnalytics data={analyticsData} />}

      <PartsTable parts={filteredParts} onEdit={setEditingPart} onDelete={handleDeletePart} onAddToInvoice={addToInvoice} />

      {showForm && <PartForm onSubmit={handleAddPart} onCancel={() => setShowForm(false)} />}

      {editingPart && <PartForm initialData={editingPart} onSubmit={(data) => handleUpdatePart(editingPart.id, data, data.quantity - editingPart.quantity)} onCancel={() => setEditingPart(null)} />}
    </div>
  );
}