import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function InvoiceHistoryScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editData, setEditData] = useState({ title: '', po: '', total: 0 });
  const [editParts, setEditParts] = useState([]);
  const [newPart, setNewPart] = useState({ name: '', price: 0 });
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    console.log('User object in InvoiceHistoryScreen:', user); // Log the user object for debugging

    if (!user) {
      console.warn('User is not authenticated. Cannot fetch invoices.');
      return;
    }

    const fetchInvoices = async () => {
      try {
        const invoicesRef = collection(db, 'users', user.uid, 'invoices');
        const snapshot = await getDocs(invoicesRef);

        if (snapshot.empty) {
          setInvoices([]); // Handle case where no invoices are found
          return;
        }

        const invoiceList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setInvoices(invoiceList);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        alert('❌ Failed to load invoices. Please try again later.');
      }
    };

    fetchInvoices();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading user data...</p>
      </div>
    );
  }

  const startEditing = (invoice) => {
    setEditingInvoice(invoice.id);
    setEditData({ title: invoice.title, po: invoice.po, total: invoice.total });
    setEditParts(invoice.parts || []);
    setShowEditor(true);
  };

  const saveEdit = async () => {
    if (!editingInvoice || !user) return;

    const subtotal = editParts.reduce((sum, part) => sum + (part.price || 0), 0);
    const updatedInvoice = { ...editData, parts: editParts, total: subtotal };

    try {
      const invoiceRef = doc(db, 'users', user.uid, 'invoices', editingInvoice);
      await updateDoc(invoiceRef, updatedInvoice);

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === editingInvoice ? { ...inv, ...updatedInvoice } : inv))
      );

      setEditingInvoice(null);
      setEditData({ title: '', po: '', total: 0 });
      setEditParts([]);
      setShowEditor(false);
      alert('✅ Invoice updated successfully.');
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('❌ Failed to save invoice. Please try again later.');
    }
  };

  const deleteInvoice = async (invoiceId) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        const invoiceRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
        await deleteDoc(invoiceRef);

        setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
        alert('✅ Invoice deleted successfully.');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('❌ Failed to delete invoice. Please try again later.');
      }
    }
  };

  const addPart = () => {
    if (!newPart.name.trim() || newPart.price <= 0) return;
    setEditParts((prev) => [...prev, { ...newPart }]);
    setNewPart({ name: '', price: 0 });
  };

  const removePart = (partToRemove) => {
    setEditParts((prev) =>
      prev.filter((part) => part.name !== partToRemove.name || part.price !== partToRemove.price)
    );
  };

  const cancelEdit = () => {
    setEditingInvoice(null);
    setEditData({ title: '', po: '', total: 0 });
    setEditParts([]);
    setShowEditor(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Home Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            ← Back to Home
          </button>
        </div>

        <h1 className="text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-12">
          📜 Invoice History
        </h1>

        {invoices.length === 0 ? (
          <div className="text-center text-gray-500">
            <p className="text-lg">No invoices found.</p>
            <p className="mt-4">
              <a href="/invoice" className="text-blue-500 hover:underline">
                Create your first invoice
              </a>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white shadow-lg rounded-3xl p-6 hover:shadow-xl transition">
                <h3 className="text-xl font-bold text-blue-700 mb-2">{invoice.title}</h3>
                <p className="text-sm text-gray-500">Invoice ID: <span className="font-medium">{invoice.invoiceId || 'N/A'}</span></p>
                <p className="text-sm text-gray-500">PO: <span className="font-medium">{invoice.po}</span></p>
                <p className="text-sm text-gray-500">Total: <span className="font-medium">${invoice.total.toFixed(2)}</span></p>
                <p className="text-sm text-gray-500">Customer: <span className="font-medium">{invoice.customer?.name || 'N/A'}</span></p>
                <p className="text-sm text-gray-500">Phone: <span className="font-medium">{invoice.customer?.phone || 'N/A'}</span></p>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => startEditing(invoice)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteInvoice(invoice.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invoice Editor Modal */}
        {showEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-3xl">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Edit Invoice</h2>
              <div className="space-y-4">
                <input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Invoice Title"
                  className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                />
                <input
                  value={editData.po}
                  onChange={(e) => setEditData({ ...editData, po: e.target.value })}
                  placeholder="PO Number"
                  className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300 w-full"
                />
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">Parts</h4>
                  <ul className="divide-y divide-gray-200 mb-4">
                    {editParts.map((part, index) => (
                      <li key={index} className="flex justify-between items-center py-2">
                        <span>{part.name} - ${part.price.toFixed(2)}</span>
                        <button
                          onClick={() => removePart(part)}
                          className="text-red-500 hover:underline text-sm"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      value={newPart.name}
                      onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                      placeholder="Part Name"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner flex-1"
                    />
                    <input
                      value={newPart.price}
                      onChange={(e) => setNewPart({ ...newPart, price: parseFloat(e.target.value) || 0 })}
                      placeholder="Price"
                      type="number"
                      className="p-3 border border-gray-300 rounded-lg shadow-inner flex-1"
                    />
                    <button
                      onClick={addPart}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={saveEdit}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}