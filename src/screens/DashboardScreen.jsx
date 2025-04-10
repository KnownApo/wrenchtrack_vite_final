import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalInvoices: 0, totalBilled: 0, jobs: [] });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const invoicesRef = collection(db, 'users', user.uid, 'invoices');
      const jobsRef = collection(db, 'users', user.uid, 'jobs');

      // Get total invoices count and billed amount
      const invoiceSnapshot = await getDocs(invoicesRef);
      const totalInvoices = invoiceSnapshot.size;
      const totalBilled = invoiceSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);

      // Get recent jobs
      const jobQuery = query(jobsRef, orderBy('startTime', 'desc'), limit(5));
      const jobSnapshot = await getDocs(jobQuery);
      const jobs = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStats({ totalInvoices, totalBilled, jobs });
    };

    fetchStats();
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">📊 Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold">Invoices This Month</h2>
          <p className="text-3xl font-bold">{stats.totalInvoices}</p>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold">Total Billed</h2>
          <p className="text-3xl font-bold text-green-600">${stats.totalBilled.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2">🧰 Recent Jobs</h2>
        {stats.jobs.length === 0 ? (
          <p className="text-gray-500">No jobs logged yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {stats.jobs.map(job => (
              <li key={job.id} className="py-2">
                <div className="font-medium">{job.title || 'Untitled Job'}</div>
                <div className="text-sm text-gray-500">{new Date(job.startTime?.seconds * 1000).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <a href="/invoice" className="bg-blue-600 text-white rounded p-4 text-center font-semibold hover:bg-blue-700">+ Create Invoice</a>
        <a href="/job" className="bg-green-600 text-white rounded p-4 text-center font-semibold hover:bg-green-700">▶ Start Job</a>
        <a href="/customers" className="bg-yellow-500 text-white rounded p-4 text-center font-semibold hover:bg-yellow-600">+ Add Customer</a>
      </div>
    </div>
  );
}
