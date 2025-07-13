import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { AuthProvider } from './context/AuthContext.jsx';
import { JobLogProvider } from './context/JobLogContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <JobLogProvider>
        <App />
      </JobLogProvider>
    </AuthProvider>
  </React.StrictMode>
);
