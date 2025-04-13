import React, { useState, useContext, useEffect } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function PartsScreen() {
  const navigate = useNavigate(); // Add navigation hook
  const { parts = [], setParts } = useContext(JobLogContext); // Fallback to an empty array if parts is undefined
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editData, setEditData] = useState({ name: '', price: '', category: '', stock: '' });
  const [catalogParts, setCatalogParts] = useState([]); // Parts catalog for the invoice screen
  

  useEffect(() => {
    const fetchCatalogParts = async () => {
      const partsRef = collection(db, 'users', 'partsCatalog');
      const snapshot = await getDocs(partsRef);
      const fetchedParts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCatalogParts(fetchedParts);
    };

    fetchCatalogParts();
  }, []);

  const addPartToCatalog = async () => {
    if (name && price) {
      const newPart = { name, price: parseFloat(price), category };
      await addDoc(collection(db, 'users', 'partsCatalog'), newPart);
      setCatalogParts([...catalogParts, newPart]);
      setName('');
      setPrice('');
      setCategory('');
    }
  };

  const addPartToStock = () => {
    if (name && price && stock) {
      setParts([...parts, { name, price: parseFloat(price), category, stock: parseInt(stock, 10) }]);
      setName('');
      setPrice('');
      setCategory('');
      setStock('');
    }
  };

  const deletePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditData(parts[index]);
  };

  const saveEdit = () => {
    const updatedParts = [...parts];
    updatedParts[editingIndex] = editData;
    setParts(updatedParts);
    setEditingIndex(null);
    setEditData({ name: '', price: '', category: '', stock: '' });
  };

  const restockPart = (index, amount) => {
    const updatedParts = [...parts];
    updatedParts[index].stock += amount;
    setParts(updatedParts);
  };

  const filteredParts = parts
    .filter(part => part.name.toLowerCase().includes(searchQuery.toLowerCase()) || part.category.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOption === 'name') return a.name.localeCompare(b.name);
      if (sortOption === 'price') return a.price - b.price;
      if (sortOption === 'stock') return a.stock - b.stock;
      if (sortOption === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Home Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          ← Back to Home
        </button>
      </div>

      <h2 className="text-3xl font-bold mb-6 text-blue-800">🔧 Parts Management</h2>

      {/* Add Part to Catalog Section */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Add Part to Catalog</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Part Name"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Price"
            type="number"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Category (e.g., Engine, Tires)"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
        </div>
        <button
          onClick={addPartToCatalog}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Add to Catalog
        </button>
      </div>

      {/* Add Part to Stock Section */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Add Part to Stock</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Part Name"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Price"
            type="number"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Category (e.g., Engine, Tires)"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
          <input
            value={stock}
            onChange={e => setStock(e.target.value)}
            placeholder="Stock Quantity"
            type="number"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
        </div>
        <button
          onClick={addPartToStock}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Add to Stock
        </button>
      </div>

      {/* Search and Sort Section */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Search and Sort</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or category"
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          />
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="border p-3 rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
          >
            <option value="">-- Sort By --</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {/* Parts List Section */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Parts List</h3>
        {filteredParts.length === 0 ? (
          <p className="text-gray-500">No parts found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredParts.map((part, index) => (
              <li key={index} className="py-4 flex justify-between items-center">
                {editingIndex === index ? (
                  <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <input
                      value={editData.name}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Part Name"
                      className="border p-2 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 flex-1"
                    />
                    <input
                      value={editData.price}
                      onChange={e => setEditData({ ...editData, price: parseFloat(e.target.value) || '' })}
                      placeholder="Price"
                      type="number"
                      className="border p-2 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 flex-1"
                    />
                    <input
                      value={editData.category}
                      onChange={e => setEditData({ ...editData, category: e.target.value })}
                      placeholder="Category"
                      className="border p-2 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 flex-1"
                    />
                    <input
                      value={editData.stock}
                      onChange={e => setEditData({ ...editData, stock: parseInt(e.target.value, 10) || '' })}
                      placeholder="Stock"
                      type="number"
                      className="border p-2 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 flex-1"
                    />
                    <button
                      onClick={saveEdit}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{part.name}</p>
                    <p className="text-sm text-gray-500">Price: ${part.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Category: {part.category || 'Uncategorized'}</p>
                    <p className={`text-sm font-medium ${part.stock <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                      Stock: {part.stock} {part.stock <= 5 && '(Low Stock)'}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  {editingIndex !== index && (
                    <button
                      onClick={() => startEditing(index)}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => deletePart(index)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => restockPart(index, 10)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Restock +10
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
