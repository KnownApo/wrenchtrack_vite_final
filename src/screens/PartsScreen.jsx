import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Added this import to fix the ReferenceError
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import PartsTable from '../components/PartsTable';
import PartForm from '../components/PartForm';
import PartsAnalytics from '../components/PartsAnalytics';

export default function PartsScreen() {
  const navigate = useNavigate(); // Now defined after import
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
      
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const partsRef = collection(db, 'users', auth.currentUser.uid, 'parts');
      const q = query(partsRef, where('status', '!=', 'deleted'));
      
      const querySnapshot = await getDocs(q);
      const partsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setParts(partsData);
      
      // Calculate analytics
      const totalValue = partsData.reduce((sum, part) => sum + (part.quantity * part.cost), 0);
      const lowStock = partsData.filter(part => part.quantity < part.minStock || 5).length;
      
      setAnalyticsData({
        totalParts: partsData.length,
        totalValue,
        lowStock
      });
      
    } catch (err) {
      console.error('Error fetching parts:', err);
      setError('Failed to load parts. Please try again.');
      toast.error('Error loading parts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const handleAddPart = async (partData) => {
    try {
      if (!auth.currentUser) return;

      const partsRef = collection(db, 'users', auth.currentUser.uid, 'parts');
      await addDoc(partsRef, {
        ...partData,
        createdAt: new Date(),
        status: 'active'
      });
      
      toast.success('Part added successfully');
      setShowForm(false);
      fetchParts();
    } catch (err) {
      console.error('Error adding part:', err);
      toast.error('Failed to add part');
    }
  };

  const handleUpdatePart = async (id, partData) => {
    try {
      if (!auth.currentUser) return;

      const partRef = doc(db, 'users', auth.currentUser.uid, 'parts', id);
      await updateDoc(partRef, {
        ...partData,
        updatedAt: new Date()
      });
      
      toast.success('Part updated successfully');
      setEditingPart(null);
      fetchParts();
    } catch (err) {
      console.error('Error updating part:', err);
      toast.error('Failed to update part');
    }
  };

  const handleDeletePart = async (id) => {
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    
    try {
      if (!auth.currentUser) return;

      const partRef = doc(db, 'users', auth.currentUser.uid, 'parts', id);
      await updateDoc(partRef, {
        status: 'deleted',
        deletedAt: new Date()
      });
      
      toast.success('Part deleted successfully');
      fetchParts();
    } catch (err) {
      console.error('Error deleting part:', err);
      toast.error('Failed to delete part');
    }
  };

  const filteredParts = parts.filter(part => 
    part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Parts Inventory</h1>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add New Part
        </button>
      </div>

      <input
        type="text"
        placeholder="Search parts..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />

      {analyticsData && <PartsAnalytics data={analyticsData} />}

      <PartsTable 
        parts={filteredParts}
        onEdit={(part) => setEditingPart(part)}
        onDelete={handleDeletePart}
      />

      {showForm && (
        <PartForm
          onSubmit={handleAddPart}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingPart && (
        <PartForm
          initialData={editingPart}
          onSubmit={(data) => handleUpdatePart(editingPart.id, data)}
          onCancel={() => setEditingPart(null)}
        />
      )}
    </div>
  );
}