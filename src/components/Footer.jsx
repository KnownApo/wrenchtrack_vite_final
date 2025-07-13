import React from 'react';

export default function Footer({ theme }) {
  return (
    <footer className={`p-4 text-center text-sm ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'} border-t dark:border-gray-700`}>
      © {new Date().getFullYear()} WrenchTrack. All rights reserved. | Version 1.0
    </footer>
  );
}