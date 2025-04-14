import React, { useEffect, useState, useRef } from 'react';
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

export default function InvoiceBuilderScreen() {
  const { user } = useAuth(); // Ensure the user object is provided
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [taxRate, setTaxRate] = useState(0.1);
  const [signatureURL, setSignatureURL] = useState('');
  const [companySettings, setCompanySettings] = useState({});
  const [newPart, setNewPart] = useState({ name: '', price: '' });
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const pdfRef = useRef();

  // Fetch settings and customers
  useEffect(() => {
    if (!user) {
      console.warn('User is not authenticated. Cannot fetch data.');
      return;
    }

    const loadSettings = async () => {
      try {
        const ref = doc(db, 'settings', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setCompanySettings(data);
          setInvoiceTitle((prev) => prev || data.preferences?.defaultInvoiceTitle || '');
          setTaxRate((prev) => prev !== undefined ? prev : data.taxRate || 0.1);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    const loadCustomers = async () => {
      try {
        const custSnap = await getDocs(collection(db, 'users', user.uid, 'customers'));
        setCustomers(custSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };

    loadSettings();
    loadCustomers();
  }, [user]);

  // Fetch saved invoices
  useEffect(() => {
    if (!user) return;

    const fetchSavedInvoices = async () => {
      try {
        const invoicesRef = collection(db, 'users', user.uid, 'invoices');
        const snapshot = await getDocs(invoicesRef);
        const invoices = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setSavedInvoices(invoices);
      } catch (error) {
        console.error('Error fetching saved invoices:', error);
      }
    };

    fetchSavedInvoices();
  }, [user]);

  // Load a saved invoice
  const handleLoadInvoice = async () => {
    if (!selectedInvoiceId) {
      alert('Please select an invoice to load.');
      return;
    }

    try {
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
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('❌ Failed to load invoice.');
    }
  };

  // Add a part to the invoice
  const handleAddPart = () => {
    if (!newPart.name || !newPart.price) {
      alert('Please provide both part name and price.');
      return;
    }
    setSelectedParts([...selectedParts, { ...newPart, price: parseFloat(newPart.price) }]);
    setNewPart({ name: '', price: '' });
  };

  // Remove a part from the invoice
  const handleRemovePart = (index) => {
    const updatedParts = selectedParts.filter((_, i) => i !== index);
    setSelectedParts(updatedParts);
  };

  // Navigate to the signature screen
  const handleNavigateToSignature = () => {
    navigate('/signature');
  };

  // Generate a unique invoice ID
  const generateInvoiceId = () => {
    const randomSequence = Math.floor(100000 + Math.random() * 900000);
    return `INV-${poNumber}-${randomSequence}`;
  };

  // Calculate subtotal, tax, and total
  const subtotal = selectedParts.reduce((sum, part) => sum + (part.price || 0), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Load persisted invoice state from sessionStorage
  useEffect(() => {
    const savedInvoice = sessionStorage.getItem('invoiceState');
    if (savedInvoice) {
      try {
        const parsedInvoice = JSON.parse(savedInvoice);
        console.log('Loaded invoice state from sessionStorage:', parsedInvoice); // Debugging log
        setInvoiceTitle(parsedInvoice.invoiceTitle || '');
        setPoNumber(parsedInvoice.poNumber || '');
        setSelectedCustomer(parsedInvoice.selectedCustomer || '');
        setSelectedParts(parsedInvoice.selectedParts || []);
        setInvoiceDate(parsedInvoice.invoiceDate || new Date().toISOString().split('T')[0]);
        setDueDate(parsedInvoice.dueDate || '');
        setNotes(parsedInvoice.notes || '');
        setSignatureURL(parsedInvoice.signatureURL || '');
      } catch (error) {
        console.error('Error parsing saved invoice state:', error);
        sessionStorage.removeItem('invoiceState'); // Clear corrupted state
      }
    }
  }, []);

  // Persist invoice state to sessionStorage whenever it changes
  useEffect(() => {
    const invoiceState = {
      invoiceTitle,
      poNumber,
      selectedCustomer,
      selectedParts,
      invoiceDate,
      dueDate,
      notes,
      signatureURL,
    };
    try {
      sessionStorage.setItem('invoiceState', JSON.stringify(invoiceState));
      console.log('Saved invoice state to sessionStorage:', invoiceState); // Debugging log
    } catch (error) {
      console.error('Error saving invoice state:', error);
    }
  }, [invoiceTitle, poNumber, selectedCustomer, selectedParts, invoiceDate, dueDate, notes, signatureURL]);

  // Reset the invoice and clear sessionStorage
  const resetInvoice = () => {
    if (window.confirm('Are you sure you want to reset the invoice? This action cannot be undone.')) {
      setInvoiceTitle('');
      setPoNumber('');
      setSelectedCustomer('');
      setSelectedParts([]);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setNotes('');
      setSignatureURL(''); // Clear the signature
      sessionStorage.removeItem('invoiceState'); // Clear session storage
      sessionStorage.removeItem('signatureURL'); // Clear signature from session storage
      alert('Invoice has been reset.');
    }
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomer || selectedParts.length === 0 || !invoiceTitle || !poNumber) {
      alert('Please fill out all invoice details.');
      return;
    }

    if (!signatureURL) {
      alert('Please capture a signature before saving the invoice.');
      return;
    }

    const invoiceId = generateInvoiceId(); // Generate the invoice ID

    try {
      const customerRef = doc(db, 'users', user.uid, 'customers', selectedCustomer);
      const customerSnap = await getDoc(customerRef);
      const customerData = customerSnap.exists() ? customerSnap.data() : null;

      const invoiceData = {
        id: invoiceId,
        title: invoiceTitle,
        po: poNumber,
        customer: customerData,
        parts: selectedParts,
        subtotal,
        tax,
        total,
        invoiceDate,
        dueDate,
        notes,
        signatureURL,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'users', user.uid, 'invoices'), invoiceData);
      alert('✅ Invoice saved successfully.');

      // Clear the signature after saving
      console.log('Clearing signature after saving...');
      setSignatureURL('');
      sessionStorage.removeItem('signatureURL');
      console.log('Signature cleared.');

      resetInvoice(); // Reset the invoice after saving
    } catch (error) {
      console.error('Error saving invoice:', error);
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
      .then(() => {
        // Clear the signature after downloading
        console.log('Clearing signature after downloading...');
        setSignatureURL('');
        sessionStorage.removeItem('signatureURL');
        console.log('Signature cleared.');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        alert('❌ Failed to download invoice.');
      });
  };

  const loadInvoice = async () => {
    if (!selectedInvoiceId) return;
    const invoiceSnap = await getDoc(invoiceRef);

    if (invoiceSnap.exists()) {
      const invoiceData = invoiceSnap.data();
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

  // Fetch the saved signature when the component loads
  useEffect(() => {
    if (!user) return;

    const loadSignature = async () => {
      try {
        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'signature');
        const signatureSnap = await getDoc(userSettingsRef);

        if (signatureSnap.exists()) {
          const data = signatureSnap.data();
          setSignatureURL(data.signatureURL || ''); // Load the saved signature URL
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    };

    loadSignature();

    // Clear the signature when the component unmounts
    return () => {
      console.log('Clearing signature on unmount...');
      setSignatureURL('');
      sessionStorage.removeItem('signatureURL');
    };
  }, [user]);

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
          ✨ Build Your Invoice
        </h1>

        {/* Load Saved Invoice */}
        <div className="bg-white shadow-lg rounded-3xl p-8 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📂 Load a Saved Invoice</h2>
          <div className="flex gap-4">
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
            >
              <option value="">-- Select an Invoice --</option>
              {savedInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.title} (PO: {invoice.po})
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadInvoice}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition"
            >
              Load Invoice
            </button>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white shadow-lg rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">📝 Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-lg font-medium text-gray-700 mb-2">Invoice Title</label>
              <input
                value={invoiceTitle}
                onChange={(e) => setInvoiceTitle(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
                placeholder="Enter invoice title"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-lg font-medium text-gray-700 mb-2">PO Number</label>
              <input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
                placeholder="Enter PO number"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-lg font-medium text-gray-700 mb-2">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-lg font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col md:col-span-2">
              <label className="text-lg font-medium text-gray-700 mb-2">Select Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
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
                className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
                placeholder="Enter any additional notes for the invoice"
                rows="3"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Parts Section */}
        <div className="bg-white shadow-lg rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">🔧 Parts</h2>
          <ul className="list-disc pl-5 mb-6">
            {selectedParts.map((part, index) => (
              <li key={index} className="flex justify-between items-center">
                <span>{part.name} - ${part.price.toFixed(2)}</span>
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
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
            />
            <input
              type="number"
              placeholder="Price"
              value={newPart.price}
              onChange={(e) => setNewPart({ ...newPart, price: e.target.value })}
              className="p-3 border border-gray-300 rounded-lg shadow-inner focus:ring focus:ring-blue-300"
            />
            <button
              onClick={handleAddPart}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition"
            >
              Add Part
            </button>
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white shadow-lg rounded-3xl p-8 mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">✍️ Signature</h2>
          {signatureURL ? (
            <div className="text-center">
              <img src={signatureURL} alt="Captured Signature" className="mx-auto border rounded-lg shadow-md" />
              <p className="text-gray-600 mt-4">Signature captured successfully.</p>
            </div>
          ) : (
            <p className="text-gray-500 text-center">No signature captured yet.</p>
          )}
          <div className="text-center mt-6">
            <button
              onClick={handleNavigateToSignature}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition"
            >
              Capture Signature
            </button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div
          ref={pdfRef}
          className="bg-white shadow-lg rounded-3xl p-8 mt-12 border border-gray-300"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-blue-700">{invoiceTitle}</h2>
              <p className="text-lg text-gray-600 font-medium">Invoice ID: {generateInvoiceId()}</p>
              <p className="text-lg text-gray-600 font-medium">PO: {poNumber}</p>
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
            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold text-gray-700">Customer Signature:</h3>
              <img src={signatureURL} alt="Customer Signature" className="mx-auto border rounded-lg shadow-md mt-4" />
            </div>
          )}

          {notes && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-700">Additional Notes:</h3>
              <p className="text-gray-600">{notes}</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-center gap-6 mt-10">
          <button
            onClick={() => navigate('/customers')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            Go to Customers
          </button>
          <button
            onClick={() => navigate('/invoicehistory')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            View All Invoices
          </button>
          <button
            onClick={() => navigate('/signature')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            Capture Signature
          </button>
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
          <button
            onClick={resetInvoice}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
          >
            Reset Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
