import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-toastify';
import { CSVLink } from 'react-csv'; // Add dep: npm i react-csv
import { 
  Wrench, Plus, Search, Download
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import PartsTable from '../components/PartsTable';
import PartForm from '../components/PartForm';
import PartsAnalytics from '../components/PartsAnalytics';
// Stub for InvoiceContext integration (if context exists, import and use)
import { useInvoice } from '../context/InvoiceContext'; // Adjust if needed

export default function PartsScreen() {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="space-y-8">
        {/* Modern Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card-glass relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-600/10 to-purple-600/10" />
          
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg">
                  <Wrench className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    Parts Inventory
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your parts inventory and track stock levels
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <CSVLink 
                  data={filteredParts} 
                  filename="parts_inventory.csv" 
                  className="flex items-center gap-2 px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </CSVLink>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add New Part
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Analytics */}
        {analyticsData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <PartsAnalytics data={analyticsData} />
          </motion.div>
        )}

        {/* Modern Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card-glass"
        >
          <div className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or part number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
              />
            </div>
          </div>
        </motion.div>

        {/* Modern Parts Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="card-glass"
        >
          <PartsTable 
            parts={filteredParts} 
            onEdit={setEditingPart} 
            onDelete={handleDeletePart} 
            onAddToInvoice={addToInvoice} 
          />
        </motion.div>

        {/* Modern Form Modals */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="card-glass w-full max-w-md"
              >
                <PartForm 
                  onSubmit={handleAddPart} 
                  onCancel={() => setShowForm(false)} 
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingPart && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="card-glass w-full max-w-md"
              >
                <PartForm 
                  initialData={editingPart} 
                  onSubmit={(data) => handleUpdatePart(editingPart.id, data, data.quantity - editingPart.quantity)} 
                  onCancel={() => setEditingPart(null)} 
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}