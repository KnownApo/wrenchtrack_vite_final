import React, { useState, useContext, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';
import { FiBox, FiPlus, FiSearch, FiGrid, FiList, FiTrash2, FiEdit2, FiArrowLeft, FiPackage, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';

export default function PartsScreen() {
  const navigate = useNavigate();
  const { parts = [], setParts } = useContext(JobLogContext);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [view, setView] = useState('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [newPart, setNewPart] = useState({
    name: '',
    price: '',
    category: '',
    stock: '',
    description: '',
    minStock: 5,
    sku: '',
    supplier: '',
    location: '',
    lastOrdered: null,
    notes: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState({ field: 'name', direction: 'asc' });
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const categories = [
    'Engine Parts',
    'Brakes',
    'Suspension',
    'Electrical',
    'Body Parts',
    'Interior',
    'Maintenance',
    'Tools',
    'Accessories',
    'Other'
  ];

  const fetchParts = async () => {
    if (!user) {
      toast.error('Please log in to view parts');
      return;
    }
    
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'parts'));
      const fetchedParts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setParts(fetchedParts);
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Failed to load parts');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePart = (part) => {
    if (!part.name?.trim()) return 'Part name is required';
    if (!part.price || isNaN(part.price) || part.price < 0) return 'Valid price is required';
    if (!part.category) return 'Category is required';
    if (isNaN(part.stock)) return 'Valid stock quantity is required';
    if (isNaN(part.minStock) || part.minStock < 0) return 'Valid minimum stock is required';
    return null;
  };

  const handleAddPart = async () => {
    if (!user) {
      toast.error('Please log in to add parts');
      return;
    }

    const validationError = validatePart(newPart);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const partData = {
        ...newPart,
        price: parseFloat(newPart.price),
        stock: parseInt(newPart.stock) || 0,
        minStock: parseInt(newPart.minStock) || 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.uid
      };

      const docRef = await addDoc(collection(db, 'users', user.uid, 'parts'), partData);
      setParts(prev => [...prev, { id: docRef.id, ...partData }]);
      setShowAddModal(false);
      setNewPart({
        name: '',
        price: '',
        category: '',
        stock: '',
        description: '',
        minStock: 5,
        sku: '',
        supplier: '',
        location: '',
        lastOrdered: null,
        notes: ''
      });
      
      toast.success('Part added successfully');
    } catch (error) {
      console.error('Error adding part:', error);
      toast.error('Failed to add part. Please try again.');
    }
  };

  const handleUpdatePart = async () => {
    if (!user || !editingPart) return;

    const validationError = validatePart(editingPart);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const partData = {
        ...editingPart,
        price: parseFloat(editingPart.price),
        stock: parseInt(editingPart.stock) || 0,
        minStock: parseInt(editingPart.minStock) || 5,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'users', user.uid, 'parts', editingPart.id), partData);
      setParts(prev => prev.map(p => p.id === editingPart.id ? partData : p));
      setEditingPart(null);
      toast.success('Part updated successfully');
    } catch (error) {
      console.error('Error updating part:', error);
      toast.error('Failed to update part');
    }
  };

  const handleDelete = async (partId) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'parts', partId));
      setParts(prev => prev.filter(part => part.id !== partId));
      setShowDeleteConfirm(null);
      toast.success('Part deleted successfully');
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Failed to delete part');
    }
  };

  const handleUpdateStock = async (partId, newStock) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'parts', partId), { 
        stock: newStock,
        updatedAt: new Date()
      });
      setParts(prev => prev.map(part => 
        part.id === partId ? { ...part, stock: newStock } : part
      ));
      toast.success('Stock updated successfully');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const filteredParts = parts
    .filter(part => {
      const searchFields = [
        part.name,
        part.category,
        part.description,
        part.sku,
        part.supplier
      ].map(field => field?.toLowerCase() || '');
      
      const searchTerms = searchQuery.toLowerCase().split(' ');
      const matchesSearch = searchTerms.every(term =>
        searchFields.some(field => field.includes(term))
      );
      
      const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const direction = sortBy.direction === 'asc' ? 1 : -1;
      if (sortBy.field === 'price' || sortBy.field === 'stock') {
        return (a[sortBy.field] - b[sortBy.field]) * direction;
      }
      return String(a[sortBy.field] || '').localeCompare(String(b[sortBy.field] || '')) * direction;
    });

  useEffect(() => {
    if (user) {
      fetchParts();
    }
  }, [user]);

  const PartForm = ({ part, setPart, onSubmit, onCancel }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name*</label>
          <input
            type="text"
            value={part.name}
            onChange={(e) => setPart({ ...part, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Part name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price*</label>
          <input
            type="number"
            value={part.price}
            onChange={(e) => setPart({ ...part, price: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category*</label>
          <select
            value={part.category}
            onChange={(e) => setPart({ ...part, category: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
          <input
            type="text"
            value={part.sku}
            onChange={(e) => setPart({ ...part, sku: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="SKU number"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock*</label>
          <input
            type="number"
            value={part.stock}
            onChange={(e) => setPart({ ...part, stock: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Current stock"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock*</label>
          <input
            type="number"
            value={part.minStock}
            onChange={(e) => setPart({ ...part, minStock: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Minimum stock level"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea
          value={part.description}
          onChange={(e) => setPart({ ...part, description: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Part description"
          rows="3"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
          <input
            type="text"
            value={part.supplier}
            onChange={(e) => setPart({ ...part, supplier: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Supplier name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <input
            type="text"
            value={part.location}
            onChange={(e) => setPart({ ...part, location: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Storage location"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea
          value={part.notes}
          onChange={(e) => setPart({ ...part, notes: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Additional notes"
          rows="2"
        />
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {part.id ? 'Update Part' : 'Add Part'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
            >
              <FiArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiPackage className="w-6 h-6" />
              Parts Inventory
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your parts catalog and inventory</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            Add New Part
          </button>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={`${sortBy.field}-${sortBy.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortBy({ field, direction });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low-High)</option>
              <option value="price-desc">Price (High-Low)</option>
              <option value="stock-asc">Stock (Low-High)</option>
              <option value="stock-desc">Stock (High-Low)</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <FiGrid className="w-4 h-4" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <FiList className="w-4 h-4" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Parts Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredParts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FiBox className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No parts found</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredParts.map(part => (
                <div
                  key={part.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                    view === 'list' ? 'p-4' : 'p-6'
                  }`}
                >
                  <div className={view === 'list' ? 'flex items-center justify-between' : ''}>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{part.name}</h3>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ${part.price.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{part.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-400">
                            {part.category}
                          </span>
                          {part.sku && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-400">
                              SKU: {part.sku}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${
                              part.stock <= part.minStock
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-green-500 dark:text-green-400'
                            }`}>
                              Stock: {part.stock}
                            </span>
                            {part.stock <= part.minStock && (
                              <FiAlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateStock(part.id, Math.max(0, (part.stock || 0) - 1))}
                              className="p-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                            >
                              <FiMinus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStock(part.id, (part.stock || 0) + 1)}
                              className="p-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                            >
                              <FiPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`flex gap-2 ${view === 'list' ? 'ml-4' : 'mt-4'}`}>
                      <button
                        onClick={() => setEditingPart(part)}
                        className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(part.id)}
                        className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Part Modal */}
      {(showAddModal || editingPart) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingPart ? 'Edit Part' : 'Add New Part'}
            </h2>
            <PartForm
              part={editingPart || newPart}
              setPart={editingPart ? setEditingPart : setNewPart}
              onSubmit={editingPart ? handleUpdatePart : handleAddPart}
              onCancel={() => {
                setShowAddModal(false);
                setEditingPart(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="text-center">
              <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Part
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this part? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
