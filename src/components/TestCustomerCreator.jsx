import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';

export default function TestCustomerCreator() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const createTestCustomer = async () => {
    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const testCustomer = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '(555) 123-4567',
        company: 'Test Company',
        address: '123 Test Street, Test City, TC 12345',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'users', user.uid, 'customers'), testCustomer);
      toast.success('Test customer created successfully!');
    } catch (error) {
      console.error('Error creating test customer:', error);
      toast.error('Failed to create test customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Test Setup
      </h3>
      
      <button
        onClick={createTestCustomer}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
      >
        {isLoading ? 'Creating...' : 'Create Test Customer'}
      </button>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        This will create a test customer so you can test invoice creation.
      </p>
    </div>
  );
}
