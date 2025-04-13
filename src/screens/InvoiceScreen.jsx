import React, { useContext, useState } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase/firebaseConfig';

export default function InvoiceScreen() {
  const { signature, invoice, setInvoice, clearInvoice } = useContext(JobLogContext);
  const [parts, setParts] = useState([]); // Manage parts locally for the invoice
  const [newPart, setNewPart] = useState({ name: '', cost: '' }); // Manage new part input

  const handleAddPart = () => {
    if (!newPart.name || !newPart.cost) {
      alert('Please provide both part name and cost.');
      return;
    }
    setParts([...parts, newPart]); // Add the new part to the local parts array
    setNewPart({ name: '', cost: '' }); // Reset the input fields
  };

  const handleRemovePart = (index) => {
    const updatedParts = parts.filter((_, i) => i !== index);
    setParts(updatedParts); // Remove part from the local parts array
  };

  const saveInvoice = async () => {
    if (!signature) {
      alert('Please capture a signature before saving the invoice.');
      return;
    }

    const invoiceData = {
      parts, // Save only the parts added to the invoice
      signature,
      preview: document.getElementById('invoice-preview').outerHTML,
    };

    try {
      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      setInvoice(invoiceData);
      alert(`Invoice saved to Firestore with ID: ${docRef.id}`);
    } catch (error) {
      console.error('Error saving invoice to Firestore:', error);
      alert('Failed to save invoice. Please try again.');
    }
  };

  const printInvoice = () => {
    if (window.confirm('Are you sure you want to print the invoice? This will clear it from local storage.')) {
      window.print();
      clearInvoice();
      alert('Invoice printed and cleared from local storage.');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow-md rounded-lg">
      <h2 className="text-3xl font-bold text-center mb-6">Invoice</h2>
      <div id="invoice-preview" className="border rounded-lg p-4 bg-gray-50 shadow-sm">
        {/* Parts Section */}
        <div className="mb-4">
          <h3 className="text-lg font-medium">Parts Used:</h3>
          <ul className="list-disc pl-5">
            {parts.map((part, index) => (
              <li key={index} className="flex justify-between items-center">
                <span>{part.name} - ${part.cost}</span>
                <button
                  onClick={() => handleRemovePart(index)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row items-center mt-4 space-y-2 sm:space-y-0 sm:space-x-2">
            <input
              type="text"
              placeholder="Part Name"
              value={newPart.name}
              onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
              className="border rounded px-2 py-1 w-full sm:w-auto"
            />
            <input
              type="number"
              placeholder="Cost"
              value={newPart.cost}
              onChange={(e) => setNewPart({ ...newPart, cost: e.target.value })}
              className="border rounded px-2 py-1 w-full sm:w-auto"
            />
            <button
              onClick={handleAddPart}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded w-full sm:w-auto"
            >
              Add Part
            </button>
          </div>
        </div>
        {/* Signature Section */}
        {signature ? (
          <div className="mt-4">
            <h3 className="text-lg font-medium">Customer Signature:</h3>
            <img src={signature} alt="Customer Signature" className="border rounded shadow mt-2" />
          </div>
        ) : (
          <p className="text-red-500 mt-4">No signature available. Please capture a signature.</p>
        )}
      </div>
      <div className="flex space-x-4 mt-6">
        <button
          onClick={saveInvoice}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow-md"
        >
          Save Invoice
        </button>
        <button
          onClick={printInvoice}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow-md"
        >
          Print Invoice
        </button>
      </div>
      {invoice && (
        <div className="mt-8">
          <h3 className="text-lg font-medium">Saved Invoice Preview:</h3>
          <div
            dangerouslySetInnerHTML={{ __html: invoice.preview }}
            className="border rounded shadow mt-2 p-4 bg-gray-100"
          ></div>
        </div>
      )}
    </div>
  );
}
