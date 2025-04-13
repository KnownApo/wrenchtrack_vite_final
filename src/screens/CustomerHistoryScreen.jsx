import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function CustomerHistoryScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', phone: '', address: '', company: '', notes: '' });

  useEffect(() => {
    if (!user) return;

    const fetchCustomers = async () => {
      const customersRef = collection(db, 'users', user.uid, 'customers');
      const snapshot = await getDocs(customersRef);
      const customerList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCustomers(customerList);
      setFilteredCustomers(customerList); // Initialize filtered customers
    };

    fetchCustomers();
  }, [user]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilteredCustomers(
      customers.filter((customer) =>
        customer.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  const startEditing = (customer) => {
    setEditingCustomer(customer.id);
    setEditData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      company: customer.company,
      notes: customer.notes,
    });
  };

  const saveEdit = async () => {
    if (!editingCustomer || !user) return;

    const customerRef = doc(db, 'users', user.uid, 'customers', editingCustomer);
    await updateDoc(customerRef, editData);

    setCustomers((prev) =>
      prev.map((cust) => (cust.id === editingCustomer ? { ...cust, ...editData } : cust))
    );
    setFilteredCustomers((prev) =>
      prev.map((cust) => (cust.id === editingCustomer ? { ...cust, ...editData } : cust))
    );

    setEditingCustomer(null);
    setEditData({ name: '', email: '', phone: '', address: '', company: '', notes: '' });
  };

  const deleteCustomer = async (id) => {
    if (!user) return;

    const customerRef = doc(db, 'users', user.uid, 'customers', id);
    await deleteDoc(customerRef);

    setCustomers((prev) => prev.filter((cust) => cust.id !== id));
    setFilteredCustomers((prev) => prev.filter((cust) => cust.id !== id));
  };

  const fetchLastJobAndInvoice = async (customerId) => {
    const invoicesRef = collection(db, 'users', user.uid, 'invoices');
    const snapshot = await getDocs(invoicesRef);
    const customerInvoices = snapshot.docs
      .map((doc) => doc.data())
      .filter((invoice) => invoice.customer?.id === customerId);

    if (customerInvoices.length > 0) {
      const lastInvoice = customerInvoices.reduce((latest, current) =>
        new Date(latest.createdAt.seconds * 1000 || latest.createdAt) >
        new Date(current.createdAt.seconds * 1000 || current.createdAt)
          ? latest
          : current
      );
      return {
        lastJobDate: new Date(lastInvoice.createdAt.seconds * 1000 || lastInvoice.createdAt).toLocaleString(),
        lastInvoicePO: lastInvoice.po || 'N/A',
      };
    }
    return { lastJobDate: 'N/A', lastInvoicePO: 'N/A' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-12">
          📜 Customer History
        </h1>

        {/* Search Bar */}
        <div className="bg-white shadow-lg rounded-3xl p-6 mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">🔍 Search Customers</h2>
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by customer name"
            className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
          />
        </div>

        {/* Customer Cards */}
        {filteredCustomers.length === 0 ? (
          <div className="text-center text-gray-500">
            <p className="text-lg">No customers found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white shadow-lg rounded-3xl p-6 hover:shadow-xl transition transform hover:-translate-y-1"
              >
                {editingCustomer === customer.id ? (
                  <div className="space-y-4">
                    <input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Customer Name"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                    />
                    <input
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      placeholder="Email"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                    />
                    <input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="Phone"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                    />
                    <textarea
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      placeholder="Address"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                    ></textarea>
                    <input
                      value={editData.company}
                      onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                      placeholder="Company"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                    />
                    <textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      placeholder="Notes"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                    ></textarea>
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={saveEdit}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCustomer(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold text-blue-700 mb-2">{customer.name}</h3>
                    <p className="text-sm text-gray-500">Email: {customer.email || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Phone: {customer.phone || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Address: {customer.address || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Company: {customer.company || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Notes: {customer.notes || 'N/A'}</p>
                    <p className="text-sm text-gray-500">
                      Preferred Contact: {customer.preferredContact || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Added on:{' '}
                      {new Date(
                        customer.createdAt?.seconds * 1000 || customer.createdAt
                      ).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last Job: {fetchLastJobAndInvoice(customer.id).lastJobDate}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last Invoice PO: {fetchLastJobAndInvoice(customer.id).lastInvoicePO}
                    </p>
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={() => startEditing(customer)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}