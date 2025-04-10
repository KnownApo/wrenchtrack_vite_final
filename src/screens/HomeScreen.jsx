import React from 'react';
import { Link } from 'react-router-dom';

export default function HomeScreen() {
  return (
    <div className="p-10 max-w-4xl mx-auto text-center">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">🔧 WrenchTrack</h1>
      <p className="text-gray-600 text-lg mb-10">Track jobs, manage customers, log parts, and generate invoices — built for mechanics in the field.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[
          { to: '/customers', label: 'Customers', desc: 'Manage profiles & job history' },
          { to: '/job', label: 'Job Timer', desc: 'Track labor time easily' },
          { to: '/parts', label: 'Parts Catalog', desc: 'Manage job materials' },
          { to: '/invoice', label: 'Invoices', desc: 'Generate PDF invoices' },
          { to: '/signature', label: 'Signatures', desc: 'Capture approval' },
          { to: '/payment', label: 'Payments', desc: 'Mark jobs as paid' },
        ].map(link => (
          <Link key={link.to} to={link.to} className="block bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-md transition text-left">
            <h2 className="text-lg font-semibold text-blue-700 mb-1">{link.label}</h2>
            <p className="text-sm text-gray-500">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
