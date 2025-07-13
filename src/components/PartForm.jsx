import React, { useState } from 'react';

export default function PartForm({ initialData = {}, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    quantity: 0,
    cost: 0,
    minStock: 5,
    supplier: '',
    location: '',
    description: '',
    ...initialData
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.partNumber) newErrors.partNumber = 'Part number is required';
    if (formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (formData.cost < 0) newErrors.cost = 'Cost cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: ['quantity', 'cost', 'minStock'].includes(name) ? Number(value) : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md m-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{initialData.id ? 'Edit Part' : 'Add New Part'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" required />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="partNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Part Number</label>
            <input id="partNumber" name="partNumber" value={formData.partNumber} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" required />
            {errors.partNumber && <p className="text-red-500 text-sm">{errors.partNumber}</p>}
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
            <input id="quantity" name="quantity" type="number" min="0" value={formData.quantity} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" required />
            {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity}</p>}
          </div>
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost ($)</label>
            <input id="cost" name="cost" type="number" step="0.01" min="0" value={formData.cost} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" required />
            {errors.cost && <p className="text-red-500 text-sm">{errors.cost}</p>}
          </div>
          <div>
            <label htmlFor="minStock" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Min Stock Level</label>
            <input id="minStock" name="minStock" type="number" min="0" value={formData.minStock} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
            <input id="supplier" name="supplier" value={formData.supplier} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Storage Location</label>
            <input id="location" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500" rows="3" />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}