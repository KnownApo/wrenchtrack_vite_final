import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalBilled: 0,
    averageInvoice: 0,
    highestInvoice: 0,
    lowestInvoice: 0,
  });

  useEffect(() => {
    const fetchInvoiceStats = async () => {
      if (!user) return;

      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const invoiceSnapshot = await getDocs(invoicesRef);

      const totalInvoices = invoiceSnapshot.size;
      const totalBilled = invoiceSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
      const averageInvoice = totalInvoices > 0 ? totalBilled / totalInvoices : 0;

      const invoiceTotals = invoiceSnapshot.docs.map(doc => doc.data().total || 0);
      const highestInvoice = Math.max(...invoiceTotals, 0);
      const lowestInvoice = Math.min(...invoiceTotals, 0);

      setStats({ totalInvoices, totalBilled, averageInvoice, highestInvoice, lowestInvoice });
    };

    fetchInvoiceStats();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-12">
          📊 Invoice Analytics
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center hover:shadow-xl transition transform hover:-translate-y-1">
            <h2 className="text-lg font-semibold text-gray-700">Total Invoices</h2>
            <p className="text-5xl font-bold text-blue-700">{stats.totalInvoices}</p>
          </div>
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center hover:shadow-xl transition transform hover:-translate-y-1">
            <h2 className="text-lg font-semibold text-gray-700">Total Billed</h2>
            <p className="text-5xl font-bold text-green-600">${stats.totalBilled.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center hover:shadow-xl transition transform hover:-translate-y-1">
            <h2 className="text-lg font-semibold text-gray-700">Average Invoice</h2>
            <p className="text-5xl font-bold text-yellow-500">${stats.averageInvoice.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center hover:shadow-xl transition transform hover:-translate-y-1">
            <h2 className="text-lg font-semibold text-gray-700">Highest Invoice</h2>
            <p className="text-5xl font-bold text-purple-600">${stats.highestInvoice.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center hover:shadow-xl transition transform hover:-translate-y-1">
            <h2 className="text-lg font-semibold text-gray-700">Lowest Invoice</h2>
            <p className="text-5xl font-bold text-red-600">${stats.lowestInvoice.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
