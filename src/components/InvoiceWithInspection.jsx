// Integration Example: Using Vehicle Inspection Checklist in Invoice System

import React, { useState } from 'react';
import VehicleInspectionChecklist from '../components/VehicleInspectionChecklist';
import { FiCheckSquare, FiClipboard } from 'react-icons/fi';

// This shows how to integrate the inspection checklist with your invoice system
export default function InvoiceWithInspection({ invoice, onInvoiceUpdate }) {
  const [showInspection, setShowInspection] = useState(false);
  const [inspectionData, setInspectionData] = useState(null);

  const handleInspectionSave = (data) => {
    setInspectionData(data);
    
    // Calculate recommended services based on inspection failures
    const recommendedServices = generateRecommendedServices(data);
    
    // Update invoice with inspection results and recommended services
    const updatedInvoice = {
      ...invoice,
      inspectionData: data,
      recommendedServices: recommendedServices,
      // Auto-add critical failures as urgent line items
      parts: [
        ...invoice.parts,
        ...recommendedServices.filter(service => service.critical)
      ]
    };
    
    onInvoiceUpdate(updatedInvoice);
    setShowInspection(false);
  };

  const generateRecommendedServices = (inspectionData) => {
    const recommendations = [];
    
    // Example: Convert inspection failures to service recommendations
    Object.entries(inspectionData.inspectionResults).forEach(([key, status]) => {
      if (status === 'fail') {
        const [category, itemId] = key.split('_');
        const recommendation = getServiceRecommendation(category, itemId);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    });
    
    return recommendations;
  };

  const getServiceRecommendation = (category, itemId) => {
    // Map inspection failures to service recommendations
    const serviceMap = {
      'tires_tire_tread_depth': {
        name: 'Tire Replacement',
        description: 'Replace tires due to insufficient tread depth',
        cost: 600,
        critical: true,
        quantity: 4
      },
      'brakes_brake_pad_thickness': {
        name: 'Brake Pad Replacement',
        description: 'Replace brake pads - below minimum thickness',
        cost: 250,
        critical: true,
        quantity: 1
      },
      'engine_engine_oil_level': {
        name: 'Oil Change Service',
        description: 'Engine oil change and filter replacement',
        cost: 75,
        critical: false,
        quantity: 1
      },
      'electrical_battery_condition': {
        name: 'Battery Replacement',
        description: 'Replace vehicle battery',
        cost: 180,
        critical: true,
        quantity: 1
      }
    };
    
    return serviceMap[`${category}_${itemId}`] || null;
  };

  if (showInspection) {
    return (
      <VehicleInspectionChecklist
        vehicleInfo={invoice.vehicleInfo}
        onSave={handleInspectionSave}
        onClose={() => setShowInspection(false)}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Vehicle Inspection
        </h3>
        <button
          onClick={() => setShowInspection(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <FiClipboard className="w-4 h-4" />
          Start Inspection
        </button>
      </div>
      
      {inspectionData ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
            <FiCheckSquare className="w-5 h-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200 font-medium">
              Inspection Completed
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Vehicle Information
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {inspectionData.vehicleInfo.year} {inspectionData.vehicleInfo.make} {inspectionData.vehicleInfo.model}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                VIN: {inspectionData.vehicleInfo.vin}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Overall Status
              </h4>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                inspectionData.overallStatus === 'pass' ? 'bg-green-100 text-green-800' :
                inspectionData.overallStatus === 'fail' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {inspectionData.overallStatus?.toUpperCase()}
              </span>
            </div>
          </div>
          
          {inspectionData.recommendedServices && inspectionData.recommendedServices.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Recommended Services
              </h4>
              <div className="space-y-2">
                {inspectionData.recommendedServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </span>
                      {service.critical && (
                        <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Critical
                        </span>
                      )}
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      ${service.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <FiClipboard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No inspection data available. Start an inspection to generate recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
