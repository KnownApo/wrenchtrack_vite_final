import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';

export default function InvoiceHistoryScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState(null);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'users', user.uid, 'invoices'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const invoiceData = querySnapshot.docs.map(doc => ({
          docId: doc.id, // Store Firestore document ID as docId
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setInvoices(invoiceData);
      } catch (err) {
        console.error('Error loading invoices:', err);
        toast.error('Failed to load invoices');
      }
      setIsLoading(false);
    };

    loadInvoices();
  }, [user]);

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    if (filter === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return invoice.createdAt >= thirtyDaysAgo;
    }
    // Default to 'pending' if status is not set
    const status = invoice.status || 'pending';
    return status === filter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleStatusChange = async (invoice) => {
    if (!invoice.docId) return;

    try {
      const docRef = doc(db, 'users', user.uid, 'invoices', invoice.docId);
      const newStatus = invoice.status === 'completed' ? 'pending' : 'completed';
      
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.docId === invoice.docId 
            ? { ...inv, status: newStatus } 
            : inv
        )
      );

      toast.success(`Invoice marked as ${newStatus}`);
    } catch (err) {
      console.error('Document ID:', invoice.docId);
      toast.error('Failed to update status');
    }
  };

  const handleSaveEdit = async () => {
    if (!editedInvoice) return;
    try {
      // Match the Firestore structure
      const updateData = {
        title: editedInvoice.title,
        poNumber: editedInvoice.poNumber || '',
        parts: editedInvoice.parts.map(part => ({
          name: part.name,
          price: Number(part.price)
        })),
        notes: editedInvoice.notes || '',
        updatedAt: new Date(),
        status: editedInvoice.status || 'pending',
        taxRate: Number(editedInvoice.taxRate) || 0.1
      };

      await updateDoc(doc(db, 'users', user.uid, 'invoices', editedInvoice.id), updateData);
      
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.id === editedInvoice.id ? { ...inv, ...updateData } : inv
        )
      );
      setIsEditing(false);
      setEditedInvoice(null);
      setSelectedInvoice({ ...editedInvoice, ...updateData });
      toast.success('Invoice updated successfully');
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast.error('Failed to update invoice');
    }
  };

  const handleAddPart = () => {
    if (!editedInvoice) return;
    setEditedInvoice({
      ...editedInvoice,
      parts: [...editedInvoice.parts, { name: '', price: '0' }]
    });
  };

  const handleRemovePart = (index) => {
    if (!editedInvoice) return;
    const newParts = [...editedInvoice.parts];
    newParts.splice(index, 1);
    setEditedInvoice({
      ...editedInvoice,
      parts: newParts
    });
  };

  const handleDeleteInvoice = async (docId) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'invoices', docId));
        setInvoices(invoices.filter(inv => inv.docId !== docId));
        toast.success('Invoice deleted successfully');
      } catch (err) {
        console.error('Error deleting invoice:', err);
        toast.error('Failed to delete invoice');
      }
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setEditedInvoice({...invoice});
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDownloadPdf = () => {
    if (!selectedInvoice) return;
    
    const element = document.getElementById('invoice-detail-modal');
    const opt = {
      margin: 1,
      filename: `invoice-${selectedInvoice.poNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save()
      .then(() => toast.success('PDF downloaded successfully'))
      .catch(() => toast.error('Failed to generate PDF'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Invoice History</h1>
          <button
            onClick={() => navigate('/invoice')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Create New Invoice
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex gap-4 mb-6">
            {['all', 'recent', 'completed', 'pending'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === filterOption
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption}
              </button>
            ))}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.docId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{invoice.title}</h3>
                      <p className="text-gray-600">PO: {invoice.poNumber}</p>
                      <p className="text-gray-600">
                        Status: <span className={`${
                          (invoice.status || 'pending') === 'completed' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {invoice.status || 'pending'}
                        </span>
                      </p>
                      <p className="text-gray-600">Customer: {invoice.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        ${invoice.parts.reduce((sum, part) => sum + parseFloat(part.price), 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invoice.createdAt ? formatDate(invoice.createdAt) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 justify-end">
                    <button
                      onClick={() => handleViewInvoice(invoice)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleEditInvoice(invoice)}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleStatusChange(invoice)}
                      className={`${
                        invoice.status === 'completed' 
                          ? 'text-yellow-500 hover:text-yellow-700'
                          : 'text-green-500 hover:text-green-700'
                      }`}
                    >
                      Mark {invoice.status === 'completed' ? 'Pending' : 'Completed'}
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(invoice.docId)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Edit Invoice' : 'Invoice Details'}
              </h2>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedInvoice(null);
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleDownloadPdf}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>

            <div id="invoice-detail-modal" className="p-6">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={editedInvoice.title}
                        onChange={(e) => setEditedInvoice({...editedInvoice, title: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">PO Number</label>
                      <input
                        type="text"
                        value={editedInvoice.poNumber}
                        onChange={(e) => setEditedInvoice({...editedInvoice, poNumber: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={editedInvoice.taxRate * 100}
                        onChange={(e) => setEditedInvoice({
                          ...editedInvoice,
                          taxRate: Math.max(0, Math.min(100, parseFloat(e.target.value))) / 100
                        })}
                        className="w-full border rounded-lg px-4 py-2"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Due Date</label>
                      <input
                        type="date"
                        value={editedInvoice.dueDate || ''}
                        onChange={(e) => setEditedInvoice({...editedInvoice, dueDate: e.target.value})}
                        className="w-full border rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Parts</h3>
                      <button
                        onClick={handleAddPart}
                        className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600"
                      >
                        Add Part
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editedInvoice.parts.map((part, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => {
                              const newParts = [...editedInvoice.parts];
                              newParts[index] = { ...part, name: e.target.value };
                              setEditedInvoice({ ...editedInvoice, parts: newParts });
                            }}
                            placeholder="Part name"
                            className="flex-1 border rounded-lg px-4 py-2"
                          />
                          <input
                            type="number"
                            value={part.price}
                            onChange={(e) => {
                              const newParts = [...editedInvoice.parts];
                              newParts[index] = { ...part, price: e.target.value };
                              setEditedInvoice({ ...editedInvoice, parts: newParts });
                            }}
                            placeholder="Price"
                            className="w-32 border rounded-lg px-4 py-2"
                            min="0"
                            step="0.01"
                          />
                          <button
                            onClick={() => handleRemovePart(index)}
                            className="text-red-500 hover:text-red-700 px-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={editedInvoice.notes || ''}
                      onChange={(e) => setEditedInvoice({...editedInvoice, notes: e.target.value})}
                      className="w-full border rounded-lg px-4 py-2"
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                // Existing view-only content
                <>
                  {/* Invoice Content */}
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">{selectedInvoice.title}</h1>
                    <p className="text-gray-600">Invoice ID: {selectedInvoice.id}</p>
                    <p className="text-gray-600">PO: {selectedInvoice.poNumber}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                      <h3 className="font-semibold mb-2">Bill To:</h3>
                      <p>{selectedInvoice.customer?.name}</p>
                      <p>{selectedInvoice.customer?.company}</p>
                      <p>{selectedInvoice.customer?.address}</p>
                      <p>{selectedInvoice.customer?.email}</p>
                    </div>
                    <div className="text-right">
                      <p><span className="text-gray-600">Date: </span>
                        {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                      </p>
                      {selectedInvoice.dueDate && (
                        <p><span className="text-gray-600">Due Date: </span>{selectedInvoice.dueDate}</p>
                      )}
                    </div>
                  </div>

                  <table className="w-full mb-6">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.parts.map((part, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{part.name}</td>
                          <td className="text-right py-2">${parseFloat(part.price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="py-2">Total</td>
                        <td className="text-right py-2 font-bold">
                          ${selectedInvoice.parts.reduce((sum, part) => sum + parseFloat(part.price), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {selectedInvoice.notes && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Notes:</h3>
                      <p className="text-gray-600">{selectedInvoice.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}