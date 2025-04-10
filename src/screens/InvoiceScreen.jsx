import React, { useContext, useRef } from 'react';
import { JobLogContext } from '../context/JobLogContext';
import html2pdf from 'html2pdf.js';

export default function InvoiceScreen() {
  const { customer, jobDuration, parts, paid, signature } = useContext(JobLogContext);
  const pdfRef = useRef();

  const downloadPDF = () => {
    html2pdf().from(pdfRef.current).save(`invoice-${Date.now()}.pdf`);
  };

  const today = new Date().toLocaleDateString();
  const invoiceNumber = 'INV-' + Math.floor(1000 + Math.random() * 9000);
  const total = parts.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-4 text-center text-blue-700">Invoice</h2>
      <div ref={pdfRef} className="bg-white shadow-lg rounded-lg p-6 text-sm space-y-4">
        <header className="border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold text-blue-600">WrenchTrack Mechanics</h1>
          <p className="text-gray-600">123 Repair Lane, Motor City, USA</p>
          <p className="text-gray-600">support@wrenchtrack.com</p>
        </header>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Invoice #:</strong> {invoiceNumber}</p>
            <p><strong>Date:</strong> {today}</p>
            <p><strong>Status:</strong> {paid ? 'Paid' : 'Unpaid'}</p>
          </div>
          <div>
            <p><strong>Customer:</strong> {customer || 'N/A'}</p>
            <p><strong>Job Duration:</strong> {Math.floor(jobDuration / 60)} min {jobDuration % 60} sec</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Parts Used</h3>
          <table className="w-full border text-left text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Part</th>
                <th className="border p-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part, i) => (
                <tr key={i}>
                  <td className="border p-2">{part.name}</td>
                  <td className="border p-2">${part.price.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border p-2">Total</td>
                <td className="border p-2">${total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {signature && (
          <div>
            <p className="font-semibold mt-4">Client Signature</p>
            <img src={signature} alt="Signature" className="border w-48 mt-1" />
          </div>
        )}
        <footer className="pt-4 mt-4 border-t text-xs text-gray-500">
          Thank you for choosing WrenchTrack. Payment due upon receipt unless otherwise agreed.
        </footer>
      </div>
      <div className="text-center mt-6">
        <button onClick={downloadPDF} className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700">
          Download PDF
        </button>
      </div>
    </div>
  );
}
