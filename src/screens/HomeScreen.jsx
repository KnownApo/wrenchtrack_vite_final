import React from 'react';
import { Link } from 'react-router-dom';

export default function HomeScreen() {
  return (
    <div className="p-10 max-w-6xl mx-auto">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-blue-700 mb-4">🔧 WrenchTrack</h1>
        <p className="text-gray-600 text-lg">Streamline your workflow — manage customers, track jobs, log parts, and generate invoices effortlessly.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { to: '/dashboard', label: 'Dashboard', desc: 'View overall stats & insights', icon: '📊' },
          { to: '/customers', label: 'Customers', desc: 'Manage profiles & job history', icon: '👥' },
          { to: '/job', label: 'Job Timer', desc: 'Track labor time easily', icon: '⏱️' },
          { to: '/parts', label: 'Parts Catalog', desc: 'Manage job materials', icon: '🛠️' },
          { to: '/invoice', label: 'Invoices', desc: 'Generate PDF invoices', icon: '📄' },
          { to: '/invoicehistory', label: 'Invoice History', desc: 'View and edit past invoices', icon: '📜' },
          { to: '/signature', label: 'Signatures', desc: 'Capture approval', icon: '✍️' },
          { to: '/payment', label: 'Payments', desc: 'Mark jobs as paid', icon: '💳' },
          { to: '/settings', label: 'Settings', desc: 'Manage settings', icon: '⚙️' },
        ].map(link => (
          <Link 
            key={link.to} 
            to={link.to} 
            className="group block bg-white border border-gray-200 rounded-lg p-6 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">{link.icon}</span>
              <h2 className="text-xl font-bold text-blue-700 group-hover:text-blue-800 transition">{link.label}</h2>
            </div>
            <p className="text-gray-500 text-sm">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
