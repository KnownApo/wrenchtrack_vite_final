import React, { useContext, useEffect, useState, useRef } from 'react';
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import html2pdf from 'html2pdf.js';

export default function InvoiceBuilderScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [invoiceTitle, setInvoiceTitle] = useState('Service Invoice');
  const [poNumber, setPoNumber] = useState('');
  const [taxRate, setTaxRate] = useState(0.1); // 10%
  const pdfRef = useRef();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const custSnap = await getDocs(collection(db, 'users', user.uid, 'customers'));
      setCustomers(custSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const partSnap = await getDocs(collection(db, 'users', user.uid, 'parts'));
      setParts(partSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, [user]);

  const handleTogglePart = (part) => {
    if (selectedParts.find(p => p.id === part.id)) {
      setSelectedParts(prev => prev.filter(p => p.id !== part.id));
    } else {
      setSelectedParts(prev => [...prev, part]);
    }
  };

  const subtotal = selectedParts.reduce((sum, part) => sum + (part.price || 0), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSaveInvoice = async () => {
    if (!selectedCustomer || selectedParts.length === 0) return alert('Fill all fields');

    const customerRef = doc(db, 'users', user.uid, 'customers', selectedCustomer);
    const customerSnap = await getDoc(customerRef);
    const customerData = customerSnap.data();

    const invoiceData = {
      title: invoiceTitle,
      po: poNumber,
      customer: customerData,
      parts: selectedParts,
      subtotal,
      tax,
      total,
      createdAt: new Date()
    };

    await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceData);
    alert('Invoice saved');
  };

  const handleDownloadPDF = () => {
    const element = pdfRef.current;
    html2pdf().from(element).save(`invoice_${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">🧾 Invoice Builder</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Invoice Title</label>
          <input value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} className="border p-2 w-full rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">PO Number</label>
          <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="border p-2 w-full rounded" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Select Customer</label>
        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="border p-2 w-full rounded">
          <option value="">-- Choose Customer --</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Select Parts</label>
        <div className="space-y-2 max-h-48 overflow-y-scroll border p-2 rounded">
          {parts.map(part => (
            <div key={part.id} className="flex items-center justify-between">
              <span>{part.name} (${part.price})</span>
              <input type="checkbox" checked={!!selectedParts.find(p => p.id === part.id)} onChange={() => handleTogglePart(part)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="text-sm font-medium">Subtotal</h3>
          <p className="font-bold">${subtotal.toFixed(2)}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="text-sm font-medium">Tax ({(taxRate * 100).toFixed(1)}%)</h3>
          <p className="font-bold">${tax.toFixed(2)}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="text-sm font-medium">Total</h3>
          <p className="font-bold text-green-600">${total.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-x-4">
        <button onClick={handleSaveInvoice} className="bg-blue-600 text-white px-4 py-2 rounded">💾 Save Invoice</button>
        <button onClick={handleDownloadPDF} className="bg-gray-600 text-white px-4 py-2 rounded">📥 Download PDF</button>
      </div>

      
        <div className="mt-10 p-6 border rounded bg-white text-sm font-sans shadow-md" ref={pdfRef}>
          <div className="flex justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-blue-700">{invoiceTitle}</h2>
              <p className="text-xs text-gray-500">PO: {poNumber}</p>
              <p className="text-xs text-gray-500">Date: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold">WrenchTrack</p>
              <p>123 Repair St.</p>
              <p>support@wrenchtrack.com</p>
            </div>
          </div>
          <hr className="mb-4"/>
          <div className="mb-4">
            <p className="font-semibold">Bill To:</p>
            <p>{customers.find(c => c.id === selectedCustomer)?.name || ''}</p>
          </div>
          <table className="w-full mb-4 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">Part</th>
                <th className="border p-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {selectedParts.map(part => (
                <tr key={part.id}>
                  <td className="border p-2">{part.name}</td>
                  <td className="border p-2">${part.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right">
            <p>Subtotal: ${subtotal.toFixed(2)}</p>
            <p>Tax: ${tax.toFixed(2)}</p>
            <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
          </div>
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Thank you for your business!</p>
            <p>Terms: Payment due upon receipt</p>
          </div>
        </div>
        
        <h2 className="text-xl font-bold">{invoiceTitle}</h2>
        <p><strong>PO:</strong> {poNumber}</p>
        <p><strong>Customer:</strong> {customers.find(c => c.id === selectedCustomer)?.name || ''}</p>
        <ul className="mt-2 space-y-1">
          {selectedParts.map(part => (
            <li key={part.id}>{part.name} - ${part.price}</li>
          ))}
        </ul>
        <p className="mt-2"><strong>Subtotal:</strong> ${subtotal.toFixed(2)}</p>
        <p><strong>Tax:</strong> ${tax.toFixed(2)}</p>
        <p><strong>Total:</strong> ${total.toFixed(2)}</p>
      </div>
  );
}
