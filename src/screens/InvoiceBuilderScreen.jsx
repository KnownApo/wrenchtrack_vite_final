import React, { useEffect, useState, useRef } from 'react';
import { collection, addDoc, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
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
  const [taxRate, setTaxRate] = useState(0.1);
  const [signatureURL, setSignatureURL] = useState('');
  const [companySettings, setCompanySettings] = useState({});
  const [newPartName, setNewPartName] = useState('');
  const [newPartPrice, setNewPartPrice] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]); // Default to today's date
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const pdfRef = useRef();

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const ref = doc(db, 'settings', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setCompanySettings(data);
        if (data.taxRate !== undefined) setTaxRate(data.taxRate);
      }
    };

    const loadData = async () => {
      const custSnap = await getDocs(collection(db, 'users', user.uid, 'customers'));
      setCustomers(custSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const partSnap = await getDocs(collection(db, 'users', user.uid, 'parts'));
      setParts(partSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    loadSettings();
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchSavedInvoices = async () => {
      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const snapshot = await getDocs(invoicesRef);
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedInvoices(invoices);
    };

    fetchSavedInvoices();
  }, [user]);

  const addNewPart = async () => {
    if (!newPartName || !newPartPrice) {
      alert('Please provide both part name and price.');
      return;
    }

    const newPart = { name: newPartName, price: parseFloat(newPartPrice) };
    setParts((prev) => [...prev, newPart]);

    await addDoc(collection(db, 'users', user.uid, 'parts'), newPart);
    alert('✅ Part added to catalog.');

    setNewPartName('');
    setNewPartPrice('');
  };

  const deletePart = async (partId) => {
    if (!user) return;

    await deleteDoc(doc(db, 'users', user.uid, 'parts', partId));
    setParts((prev) => prev.filter((part) => part.id !== partId));
    alert('✅ Part deleted.');
  };

  const handleTogglePart = (part) => {
    setSelectedParts((prev) =>
      prev.find((p) => p.id === part.id)
        ? prev.filter((p) => p.id !== part.id)
        : [...prev, part]
    );
  };

  const subtotal = selectedParts.reduce((sum, part) => sum + (part.price || 0), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const generateInvoiceId = () => {
    const randomSequence = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit random number
    return `INV-${poNumber}-${randomSequence}`;
  };

  useEffect(() => {
    // Load persisted state from localStorage when the component mounts
    const savedState = localStorage.getItem('invoiceState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setInvoiceTitle(parsedState.invoiceTitle || 'Service Invoice');
        setPoNumber(parsedState.poNumber || '');
        setSelectedCustomer(parsedState.selectedCustomer || '');
        setSelectedParts(parsedState.selectedParts || []);
        setInvoiceDate(parsedState.invoiceDate || new Date().toISOString().split('T')[0]);
        setDueDate(parsedState.dueDate || '');
        setNotes(parsedState.notes || '');
      } catch (error) {
        console.error('Error parsing saved invoice state:', error);
        localStorage.removeItem('invoiceState'); // Clear corrupted state
      }
    }
  }, []); // Empty dependency array ensures this runs only once

  useEffect(() => {
    // Persist state to localStorage whenever it changes
    const invoiceState = {
      invoiceTitle,
      poNumber,
      selectedCustomer,
      selectedParts,
      invoiceDate,
      dueDate,
      notes,
    };
    try {
      localStorage.setItem('invoiceState', JSON.stringify(invoiceState));
    } catch (error) {
      console.error('Error saving invoice state:', error);
    }
  }, [invoiceTitle, poNumber, selectedCustomer, selectedParts, invoiceDate, dueDate, notes]);

  const clearInvoiceState = () => {
    // Clear localStorage when the invoice is saved
    try {
      localStorage.removeItem('invoiceState');
    } catch (error) {
      console.error('Error clearing invoice state:', error);
    }
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomer || selectedParts.length === 0 || !invoiceTitle || !poNumber) {
      alert('Please fill out all invoice details.');
      return;
    }

    const invoiceId = generateInvoiceId(); // Generate the invoice ID

    const customerRef = doc(db, 'users', user.uid, 'customers', selectedCustomer);
    const customerSnap = await getDoc(customerRef);
    const customerData = customerSnap.data();

    const invoiceData = {
      title: invoiceTitle,
      po: poNumber,
      invoiceId, // Include the generated invoice ID
      customer: customerData,
      parts: selectedParts,
      subtotal,
      tax,
      total,
      invoiceDate,
      dueDate,
      notes,
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceData);
      alert('✅ Invoice saved.');
      clearInvoiceState(); // Clear localStorage after saving
    } catch (error) {
      console.error('Error saving invoice to Firestore:', error);
      alert('❌ Failed to save invoice.');
    }
  };

  const handleDownloadInvoice = () => {
    if (!pdfRef.current) {
      alert('Invoice preview is not available.');
      return;
    }

    const element = pdfRef.current;

    html2pdf()
      .set({
        margin: [0.5, 0.5, 0.5, 0.5], // Top, Right, Bottom, Left margins
        filename: `invoice_${Date.now()}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      })
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const pageCount = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Add header and footer to each page
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);

          // Header
          pdf.setFontSize(10);
          pdf.text('Your Company Name', 0.5, 0.5);
          pdf.text('Invoice', pageWidth / 2, 0.5, { align: 'center' });

          // Footer
          pdf.setFontSize(8);
          pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 0.5, { align: 'center' });
          pdf.text('Thank you for your business!', 0.5, pageHeight - 0.5);
        }
      })
      .save()
      .catch((error) => {
        console.error('Error generating PDF:', error);
        alert('❌ Failed to download invoice.');
      });
  };

  const loadInvoice = async () => {
    if (!selectedInvoiceId) return;

    const invoiceRef = doc(db, 'users', user.uid, 'invoices', selectedInvoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (invoiceSnap.exists()) {
      const invoiceData = invoiceSnap.data();
      setInvoiceTitle(invoiceData.title || '');
      setPoNumber(invoiceData.po || '');
      setSelectedCustomer(invoiceData.customer?.id || '');
      setSelectedParts(invoiceData.parts || []);
      setInvoiceDate(invoiceData.invoiceDate || new Date().toISOString().split('T')[0]);
      setDueDate(invoiceData.dueDate || '');
      setNotes(invoiceData.notes || '');
      alert('✅ Invoice loaded successfully.');
    } else {
      alert('❌ Invoice not found.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-10 text-center">
          Invoice Builder
        </h1>

        {/* Load Saved Invoice */}
        <div className="bg-gray-100 shadow-neumorphic rounded-3xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Load Saved Invoice</h2>
          <div className="flex gap-4">
            <select
              value={selectedInvoiceId}
              onChange={e => setSelectedInvoiceId(e.target.value)}
              className="border border-gray-300 rounded-lg p-3 flex-1 focus:ring focus:ring-blue-300"
            >
              <option value="">-- Select an Invoice --</option>
              {savedInvoices.map(invoice => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.title} (PO: {invoice.po})
                </option>
              ))}
            </select>
            <button
              onClick={loadInvoice}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Load
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invoice Details */}
          <div className="bg-gray-100 shadow-neumorphic rounded-3xl p-8 col-span-2">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-lg font-medium text-gray-700 mb-2">Invoice Title</label>
                <input
                  value={invoiceTitle}
                  onChange={(e) => setInvoiceTitle(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                  placeholder="Enter invoice title"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-lg font-medium text-gray-700 mb-2">PO Number</label>
                <input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                  placeholder="Enter PO number"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-lg font-medium text-gray-700 mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-lg font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                />
              </div>
              <div className="flex flex-col md:col-span-2">
                <label className="text-lg font-medium text-gray-700 mb-2">Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col md:col-span-2">
                <label className="text-lg font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                  placeholder="Enter any additional notes for the invoice"
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Parts Section */}
          <div className="bg-gray-100 shadow-neumorphic rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Parts</h2>
            <div className="space-y-6">
              <div>
                <label className="text-lg font-medium text-gray-700 mb-2 block">Select Existing Parts</label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 shadow-inner">
                  {parts.map((part) => (
                    <div key={part.id} className="flex justify-between items-center">
                      <label className="flex items-center text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!selectedParts.find((p) => p.id === part.id)}
                          onChange={() => handleTogglePart(part)}
                          className="mr-2"
                        />
                        {part.name} (${part.price})
                      </label>
                      <button
                        onClick={() => deletePart(part.id)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Add New Part</h3>
                <form className="grid grid-cols-1 gap-3 mt-2">
                  <input
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    placeholder="Part Name"
                    className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                  />
                  <input
                    value={newPartPrice}
                    onChange={(e) => setNewPartPrice(e.target.value)}
                    placeholder="Price"
                    type="number"
                    className="border border-gray-300 rounded-lg p-3 focus:ring focus:ring-blue-300 shadow-inner"
                  />
                  <button
                    onClick={addNewPart}
                    type="button"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Preview */}
        <div
          ref={pdfRef}
          className="bg-gray-100 shadow-neumorphic rounded-3xl p-8 mt-12 border border-gray-300"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-blue-700">{invoiceTitle}</h2>
              <p className="text-lg text-gray-600 font-medium">PO: {poNumber}</p>
              <p className="text-lg text-gray-600 font-medium">Invoice ID: {generateInvoiceId()}</p>
              <p className="text-lg text-gray-600 font-medium">Invoice Date: {invoiceDate}</p>
              <p className="text-lg text-gray-600 font-medium">Due Date: {dueDate || 'N/A'}</p>
            </div>
            <div className="text-right">
              {companySettings?.businessInfo?.name && (
                <>
                  <p className="font-semibold text-gray-700 text-lg">{companySettings.businessInfo.name}</p>
                  <p className="text-gray-600">{companySettings.businessInfo.address}</p>
                  <p className="text-gray-600">{companySettings.businessInfo.email}</p>
                  <p className="text-gray-600">{companySettings.businessInfo.phone}</p>
                </>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Bill To:</h3>
            <p className="text-gray-600 font-medium">
              {customers.find((c) => c.id === selectedCustomer)?.name || 'Customer Name'}
            </p>
            <p className="text-gray-600">
              {customers.find((c) => c.id === selectedCustomer)?.address || 'Customer Address'}
            </p>
            <p className="text-gray-600">
              {customers.find((c) => c.id === selectedCustomer)?.email || 'Customer Email'}
            </p>
            <p className="text-gray-600">
              {customers.find((c) => c.id === selectedCustomer)?.phone || 'Customer Phone'}
            </p>
          </div>

          <table className="w-full text-lg border mb-8">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 border font-semibold text-gray-700">Description</th>
                <th className="text-right p-3 border font-semibold text-gray-700">Price</th>
              </tr>
            </thead>
            <tbody>
              {selectedParts.map((part, index) => (
                <tr key={index}>
                  <td className="border p-3 text-gray-700 font-medium">{part.name}</td>
                  <td className="border p-3 text-right text-gray-700 font-medium">${part.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right space-y-2 text-lg">
            <p className="text-gray-700 font-medium">Subtotal: ${subtotal.toFixed(2)}</p>
            <p className="text-gray-700 font-medium">Tax: ${tax.toFixed(2)}</p>
            <p className="text-xl font-bold text-gray-800">Total: ${total.toFixed(2)}</p>
          </div>

          {signatureURL && (
            <div className="mt-8">
              <p className="font-semibold text-lg text-gray-700 mb-2">Client Signature:</p>
              <img src={signatureURL} alt="Signature" className="h-24 border" />
            </div>
          )}

          <div className="mt-8 text-center text-sm text-gray-500 border-t pt-4">
            <p>Thank you for your business!</p>
            <p>Terms: {companySettings?.preferences?.invoiceTerms || 'Payment due upon receipt'}</p>
            {notes && <p className="text-gray-600 mt-2">Notes: {notes}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 mt-10">
          <button
            onClick={handleSaveInvoice}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Save Invoice
          </button>
          <button
            onClick={handleDownloadInvoice}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
