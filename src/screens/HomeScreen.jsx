import React from 'react';
import { Link } from 'react-router-dom';

export default function HomeScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-10">
      <header className="text-center mb-16">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-6">
          🔧 WrenchTrack
        </h1>
        <p className="text-gray-700 text-lg">
          Streamline your workflow — manage customers, track jobs, log parts, and generate invoices effortlessly.
        </p>
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
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group block bg-white border border-gray-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 hover:bg-gradient-to-r hover:from-blue-100 hover:via-purple-100 hover:to-pink-100"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{link.icon}</span>
              <h2 className="text-2xl font-bold text-blue-700 group-hover:text-blue-800 transition">
                {link.label}
              </h2>
            </div>
            <p className="text-gray-600 text-sm">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
