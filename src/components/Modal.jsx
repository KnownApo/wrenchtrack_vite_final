import React from 'react';

export const Modal = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition"
        >
          ✖
        </button>

        {/* Modal Content */}
        <div className="overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
