import React, { useState, useContext, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';

export default function PartsScreen() {
  const navigate = useNavigate();
  const { parts = [], setParts } = useContext(JobLogContext);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState({
    name: '',
    price: '',
    category: '',
    stock: '',
    description: '',
    minStock: 5,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState({ field: 'name', direction: 'asc' });
  const { user } = useAuth();

  // Predefined categories
  const categories = [
    'Engine Parts',
    'Brakes',
    'Suspension',
    'Electrical',
    'Body Parts',
    'Interior',
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

  const handleAddPart = async () => {
    if (!user) {
      toast.error('Please log in to add parts');
      return;
    }

    if (!newPart.name || !newPart.price || !newPart.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const partData = {
        ...newPart,
        price: parseFloat(newPart.price) || 0,
        stock: parseInt(newPart.stock) || 0,
        minStock: parseInt(newPart.minStock) || 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.uid
      };

      const docRef = await addDoc(collection(db, 'users', user.uid, 'parts'), partData);
      
      // Add the new part with its ID to the local state
      setParts(prev => [...prev, { id: docRef.id, ...partData }]);
      
      setShowAddModal(false);
      setNewPart({
        name: '',
        price: '',
        category: '',
        stock: '',
        description: '',
        minStock: 5,
      });
      
      toast.success('Part added successfully');
    } catch (error) {
      console.error('Error adding part:', error);
      toast.error('Failed to add part. Please try again.');
    }
  };

  const handleDelete = async (partId) => {
    if (!user) {
      toast.error('Please log in to delete parts');
      return;
    }

    if (window.confirm('Are you sure you want to delete this part?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'parts', partId));
        setParts(prev => prev.filter(part => part.id !== partId));
        toast.success('Part deleted successfully');
      } catch (error) {
        console.error('Error deleting part:', error);
        toast.error('Failed to delete part');
      }
    }
  };

  const handleUpdateStock = async (partId, newStock) => {
    if (!user) {
      toast.error('Please log in to update stock');
      return;
    }

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
      const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          part.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const direction = sortBy.direction === 'asc' ? 1 : -1;
      if (sortBy.field === 'price') {
        return (a.price - b.price) * direction;
      }
      return a[sortBy.field].localeCompare(b[sortBy.field]) * direction;
    });

  useEffect(() => {
    if (user) {
      fetchParts();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Parts Catalog</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Add New Part
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-2"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-lg px-4 py-2"
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
            className="border rounded-lg px-4 py-2"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low-High)</option>
            <option value="price-desc">Price (High-Low)</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setView('grid')}
              className={`px-4 py-2 rounded-lg ${view === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Parts Grid/List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading parts...</p>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredParts.map(part => (
            <div key={part.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-800">{part.name}</h3>
                <span className="text-lg font-bold text-blue-600">${part.price}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{part.description}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  {part.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${part.stock <= part.minStock ? 'text-red-500' : 'text-green-500'}`}>
                    Stock: {part.stock}
                  </span>
                  <button
                    onClick={() => handleUpdateStock(part.id, (part.stock || 0) + 1)}
                    className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleUpdateStock(part.id, Math.max(0, (part.stock || 0) - 1))}
                    className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    -
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => handleDelete(part.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Add New Part</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Part Name"
                value={newPart.name}
                onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                className="w-full border rounded-lg px-4 py-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={newPart.price}
                onChange={(e) => setNewPart({ ...newPart, price: e.target.value })}
                className="w-full border rounded-lg px-4 py-2"
              />
              <select
                value={newPart.category}
                onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                className="w-full border rounded-lg px-4 py-2"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Initial Stock"
                value={newPart.stock}
                onChange={(e) => setNewPart({ ...newPart, stock: e.target.value })}
                className="w-full border rounded-lg px-4 py-2"
              />
              <textarea
                placeholder="Description"
                value={newPart.description}
                onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                className="w-full border rounded-lg px-4 py-2"
              />
              <input
                type="number"
                placeholder="Minimum Stock Alert"
                value={newPart.minStock}
                onChange={(e) => setNewPart({ ...newPart, minStock: e.target.value })}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPart}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Part
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
