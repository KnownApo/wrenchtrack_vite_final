import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function InvoiceHistoryScreen() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editData, setEditData] = useState({ title: '', po: '', total: 0 });
  const [editParts, setEditParts] = useState([]);
  const [newPart, setNewPart] = useState({ name: '', price: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchInvoices = async () => {
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const snapshot = await getDocs(invoicesRef);

      if (snapshot.empty) {
        setInvoices([]); // Handle case where no invoices are found
        return;
      }

      const invoiceList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(invoiceList);
    };

    fetchInvoices();
  }, [user]);

  const startEditing = (invoice) => {
    setEditingInvoice(invoice.id);
    setEditData({ title: invoice.title, po: invoice.po, total: invoice.total });
    setEditParts(invoice.parts || []);
  };

  const saveEdit = async () => {
    if (!editingInvoice || !user) return;

    const subtotal = editParts.reduce((sum, part) => sum + (part.price || 0), 0);
    const updatedInvoice = { ...editData, parts: editParts, total: subtotal };

    const invoiceRef = doc(db, 'users', user.uid, 'invoices', editingInvoice);
    await updateDoc(invoiceRef, updatedInvoice);

    setInvoices(prev =>
      prev.map(inv => (inv.id === editingInvoice ? { ...inv, ...updatedInvoice } : inv))
    );

    setEditingInvoice(null);
    setEditData({ title: '', po: '', total: 0 });
    setEditParts([]);
  };

  const deleteInvoice = async (invoiceId) => {
    if (!user) return;

    const invoiceRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
    await deleteDoc(invoiceRef);

    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  };

  const addPart = () => {
    if (!newPart.name.trim() || newPart.price <= 0) return;
    setEditParts(prev => [...prev, { ...newPart }]);
    setNewPart({ name: '', price: 0 });
  };

  const removePart = (partToRemove) => {
    setEditParts(prev => prev.filter(part => part.name !== partToRemove.name || part.price !== partToRemove.price));
  };

  const cancelEdit = () => {
    setEditingInvoice(null);
    setEditData({ title: '', po: '', total: 0 });
    setEditParts([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-4xl font-extrabold text-blue-700 mb-8 text-center">📜 Invoice History</h2>
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
          {invoices.map(invoice => (
            <div key={invoice.id} className="bg-white shadow-lg rounded-lg p-6">
              {editingInvoice === invoice.id ? (
                <div className="space-y-4">
                  <input
                    value={editData.title}
                    onChange={e => setEditData({ ...editData, title: e.target.value })}
                    placeholder="Invoice Title"
                    className="border p-3 w-full rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
                  />
                  <input
                    value={editData.po}
                    onChange={e => setEditData({ ...editData, po: e.target.value })}
                    placeholder="PO Number"
                    className="border p-3 w-full rounded-lg text-gray-700 focus:ring focus:ring-blue-300"
                  />
                  <input
                    value={editData.total}
                    placeholder="Total Amount"
                    type="number"
                    className="border p-3 w-full rounded-lg text-gray-700 bg-gray-100"
                    readOnly
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
                        onChange={e => setNewPart({ ...newPart, name: e.target.value })}
                        placeholder="Part Name"
                        className="border p-2 rounded-lg flex-1"
                      />
                      <input
                        value={newPart.price}
                        onChange={e => setNewPart({ ...newPart, price: parseFloat(e.target.value) || 0 })}
                        placeholder="Price"
                        type="number"
                        className="border p-2 rounded-lg flex-1"
                      />
                      <button
                        onClick={addPart}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4">
                    <button onClick={saveEdit} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                      Save
                    </button>
                    <button onClick={cancelEdit} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-blue-700 mb-2">{invoice.title}</h3>
                  <p className="text-sm text-gray-500">PO: {invoice.po}</p>
                  <p className="text-sm text-gray-500">Total: ${invoice.total.toFixed(2)}</p>
                  <h4 className="text-sm font-semibold text-gray-700 mt-4">Parts:</h4>
                  <ul className="text-sm text-gray-500 list-disc pl-5">
                    {invoice.parts?.map((part, index) => (
                      <li key={index}>
                        {part.name} - ${part.price.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={() => startEditing(invoice)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteInvoice(invoice.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
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
  );
}