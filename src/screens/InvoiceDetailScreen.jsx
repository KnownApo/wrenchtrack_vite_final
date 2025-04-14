import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';

export default function InvoiceDetailScreen() {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!user || !invoiceId) {
        navigate('/invoicehistory');
        return;
      }
      try {
        const docRef = doc(db, 'users', user.uid, 'invoices', invoiceId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setInvoice({ 
            ...data,
            firestoreId: docSnap.id,
            createdAt: data.createdAt?.toDate()
          });
        } else {
          toast.error('Invoice not found');
          navigate('/invoicehistory');
        }
      } catch (err) {
        console.error('Error loading invoice:', err);
        toast.error('Failed to load invoice');
        navigate('/invoicehistory');
      }
      setIsLoading(false);
    };

    loadInvoice();
  }, [user, invoiceId, navigate]);

  const handleDownloadPdf = () => {
    const element = document.getElementById('invoice-detail');
    const opt = {
      margin: 1,
      filename: `invoice-${invoice.poNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save()
      .then(() => toast.success('PDF downloaded successfully'))
      .catch(() => toast.error('Failed to generate PDF'));
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/invoicehistory')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            ← Back
          </button>
          <button
            onClick={handleDownloadPdf}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Download PDF
          </button>
        </div>

        <div id="invoice-detail" className="bg-white rounded-xl shadow-lg p-8">
          {/* Invoice Content */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{invoice.title}</h1>
            <p className="text-gray-600">Document ID: {invoice.docId}</p>
            <p className="text-gray-600">Invoice ID: {invoice.id}</p>
            <p className="text-gray-600">PO: {invoice.poNumber}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <p>{invoice.customer?.name}</p>
              <p>{invoice.customer?.company}</p>
              <p>{invoice.customer?.address}</p>
              <p>{invoice.customer?.email}</p>
            </div>
            <div className="text-right">
              <p><span className="text-gray-600">Date: </span>{new Date(invoice.createdAt?.seconds * 1000).toLocaleDateString()}</p>
              {invoice.dueDate && <p><span className="text-gray-600">Due Date: </span>{invoice.dueDate}</p>}
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
              {invoice.parts.map((part, index) => (
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
                  ${invoice.parts.reduce((sum, part) => sum + parseFloat(part.price), 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {invoice.notes && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Notes:</h3>
              <p className="text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
