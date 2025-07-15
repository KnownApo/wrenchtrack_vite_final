import React, { useState, useRef } from 'react';
import { 
  FiCheck, 
  FiX, 
  FiAlertTriangle, 
  FiFileText, 
  FiSave,
  FiClock,
  FiTool,
  FiShield,
  FiZap,
  FiWind,
  FiRotateCw,
  FiSettings
} from 'react-icons/fi';
import html2pdf from 'html2pdf.js';

const INSPECTION_CATEGORIES = {
  tires: {
    title: 'Tires & Wheels',
    icon: FiRotateCw,
    items: [
      { id: 'tire_tread_depth', name: 'Tire Tread Depth', requirement: '≥2/32"', critical: true },
      { id: 'tire_pressure', name: 'Tire Pressure', requirement: 'Per manufacturer spec', critical: true },
      { id: 'tire_wear_pattern', name: 'Tire Wear Pattern', requirement: 'Even wear', critical: false },
      { id: 'tire_sidewall_damage', name: 'Sidewall Damage', requirement: 'No cracks/bulges', critical: true },
      { id: 'wheel_alignment', name: 'Wheel Alignment', requirement: 'Proper alignment', critical: false },
      { id: 'wheel_balance', name: 'Wheel Balance', requirement: 'No vibration', critical: false },
      { id: 'spare_tire', name: 'Spare Tire Condition', requirement: 'Good condition', critical: false }
    ]
  },
  brakes: {
    title: 'Brake System',
    icon: FiShield,
    items: [
      { id: 'brake_pad_thickness', name: 'Brake Pad Thickness', requirement: '≥3mm', critical: true },
      { id: 'brake_fluid_level', name: 'Brake Fluid Level', requirement: 'Between min/max', critical: true },
      { id: 'brake_fluid_color', name: 'Brake Fluid Color', requirement: 'Clear/amber', critical: false },
      { id: 'brake_pedal_feel', name: 'Brake Pedal Feel', requirement: 'Firm, no sponginess', critical: true },
      { id: 'brake_rotor_condition', name: 'Brake Rotor Condition', requirement: 'No scoring/warping', critical: true },
      { id: 'brake_lines', name: 'Brake Lines/Hoses', requirement: 'No leaks/cracks', critical: true },
      { id: 'parking_brake', name: 'Parking Brake', requirement: 'Proper operation', critical: false }
    ]
  },
  engine: {
    title: 'Engine & Fluids',
    icon: FiSettings,
    items: [
      { id: 'engine_oil_level', name: 'Engine Oil Level', requirement: 'Between min/max', critical: true },
      { id: 'engine_oil_condition', name: 'Engine Oil Condition', requirement: 'Clean, proper viscosity', critical: false },
      { id: 'coolant_level', name: 'Coolant Level', requirement: 'Between min/max', critical: true },
      { id: 'coolant_condition', name: 'Coolant Condition', requirement: 'Clean, no rust', critical: false },
      { id: 'transmission_fluid', name: 'Transmission Fluid', requirement: 'Proper level/color', critical: true },
      { id: 'power_steering_fluid', name: 'Power Steering Fluid', requirement: 'Proper level', critical: false },
      { id: 'windshield_washer_fluid', name: 'Windshield Washer Fluid', requirement: 'Adequate level', critical: false },
      { id: 'air_filter', name: 'Air Filter', requirement: 'Clean, not clogged', critical: false },
      { id: 'belt_condition', name: 'Belt Condition', requirement: 'No cracks/fraying', critical: true }
    ]
  },
  electrical: {
    title: 'Electrical System',
    icon: FiZap,
    items: [
      { id: 'battery_condition', name: 'Battery Condition', requirement: 'Clean terminals, secure', critical: true },
      { id: 'battery_voltage', name: 'Battery Voltage', requirement: '12.4-12.8V at rest', critical: true },
      { id: 'alternator_output', name: 'Alternator Output', requirement: '13.5-14.5V running', critical: true },
      { id: 'headlights', name: 'Headlights', requirement: 'Both working, aligned', critical: true },
      { id: 'taillights', name: 'Taillights', requirement: 'All working', critical: true },
      { id: 'turn_signals', name: 'Turn Signals', requirement: 'All working', critical: true },
      { id: 'hazard_lights', name: 'Hazard Lights', requirement: 'All working', critical: false },
      { id: 'interior_lights', name: 'Interior Lights', requirement: 'Working', critical: false },
      { id: 'dashboard_warning_lights', name: 'Dashboard Warning Lights', requirement: 'No active warnings', critical: true }
    ]
  },
  suspension: {
    title: 'Suspension & Steering',
    icon: FiTool,
    items: [
      { id: 'shock_absorbers', name: 'Shock Absorbers', requirement: 'No leaks, proper function', critical: true },
      { id: 'struts', name: 'Struts', requirement: 'No leaks, secure mounting', critical: true },
      { id: 'steering_wheel_play', name: 'Steering Wheel Play', requirement: '≤2" free play', critical: true },
      { id: 'power_steering_operation', name: 'Power Steering Operation', requirement: 'Smooth operation', critical: false },
      { id: 'ball_joints', name: 'Ball Joints', requirement: 'No excessive play', critical: true },
      { id: 'tie_rod_ends', name: 'Tie Rod Ends', requirement: 'Secure, no play', critical: true },
      { id: 'cv_joints', name: 'CV Joints', requirement: 'No clicking/grinding', critical: true }
    ]
  },
  safety: {
    title: 'Safety Equipment',
    icon: FiShield,
    items: [
      { id: 'seat_belts', name: 'Seat Belts', requirement: 'All functional', critical: true },
      { id: 'airbag_warning_light', name: 'Airbag Warning Light', requirement: 'No active warning', critical: true },
      { id: 'horn', name: 'Horn', requirement: 'Working', critical: true },
      { id: 'windshield_wipers', name: 'Windshield Wipers', requirement: 'All speeds work', critical: true },
      { id: 'windshield_condition', name: 'Windshield Condition', requirement: 'No cracks in view area', critical: true },
      { id: 'mirrors', name: 'Mirrors', requirement: 'Properly adjusted', critical: true },
      { id: 'door_locks', name: 'Door Locks', requirement: 'All working', critical: false },
      { id: 'emergency_brake', name: 'Emergency Brake', requirement: 'Proper operation', critical: true }
    ]
  },
  exhaust: {
    title: 'Exhaust System',
    icon: FiWind,
    items: [
      { id: 'exhaust_leaks', name: 'Exhaust Leaks', requirement: 'No leaks', critical: true },
      { id: 'catalytic_converter', name: 'Catalytic Converter', requirement: 'Secure, functional', critical: true },
      { id: 'muffler_condition', name: 'Muffler Condition', requirement: 'Secure, no holes', critical: false },
      { id: 'exhaust_hangers', name: 'Exhaust Hangers', requirement: 'All secure', critical: false },
      { id: 'emissions_check', name: 'Emissions Check', requirement: 'Within limits', critical: true }
    ]
  }
};

const INSPECTION_STATUSES = {
  pass: { label: 'Pass', color: 'green', icon: FiCheck },
  fail: { label: 'Fail', color: 'red', icon: FiX },
  attention: { label: 'Needs Attention', color: 'yellow', icon: FiAlertTriangle },
  na: { label: 'N/A', color: 'gray', icon: FiX }
};

export default function VehicleInspectionChecklist({ vehicleInfo = {}, onSave, onClose }) {
  const [inspectionData, setInspectionData] = useState({
    vehicleInfo: {
      make: vehicleInfo.make || '',
      model: vehicleInfo.model || '',
      year: vehicleInfo.year || '',
      vin: vehicleInfo.vin || '',
      mileage: vehicleInfo.mileage || '',
      licensePlate: vehicleInfo.licensePlate || ''
    },
    inspectorInfo: {
      name: '',
      certificationNumber: '',
      date: new Date().toISOString().split('T')[0],
      location: ''
    },
    inspectionResults: {},
    notes: {},
    overallStatus: 'pending',
    recommendations: []
  });

  const [activeCategory, setActiveCategory] = useState('tires');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const printRef = useRef();

  const handleItemInspection = (categoryId, itemId, status, note = '') => {
    setInspectionData(prev => ({
      ...prev,
      inspectionResults: {
        ...prev.inspectionResults,
        [`${categoryId}_${itemId}`]: status
      },
      notes: {
        ...prev.notes,
        [`${categoryId}_${itemId}`]: note
      }
    }));
  };

  const handleVehicleInfoChange = (field, value) => {
    setInspectionData(prev => ({
      ...prev,
      vehicleInfo: {
        ...prev.vehicleInfo,
        [field]: value
      }
    }));
  };

  const handleInspectorInfoChange = (field, value) => {
    setInspectionData(prev => ({
      ...prev,
      inspectorInfo: {
        ...prev.inspectorInfo,
        [field]: value
      }
    }));
  };

  const calculateOverallStatus = () => {
    const results = Object.values(inspectionData.inspectionResults);
    const criticalItems = [];
    
    Object.entries(INSPECTION_CATEGORIES).forEach(([catId, category]) => {
      category.items.forEach(item => {
        if (item.critical) {
          criticalItems.push(`${catId}_${item.id}`);
        }
      });
    });

    const criticalFailures = criticalItems.filter(key => 
      inspectionData.inspectionResults[key] === 'fail'
    );

    if (criticalFailures.length > 0) {
      return 'fail';
    }

    const hasAnyFailures = results.includes('fail');
    const hasAttentionItems = results.includes('attention');

    if (hasAnyFailures) {
      return 'conditional';
    }

    if (hasAttentionItems) {
      return 'attention';
    }

    return results.length > 0 ? 'pass' : 'pending';
  };

  const generateInspectionReport = async () => {
    setIsGeneratingReport(true);
    
    const element = printRef.current;
    const opt = {
      margin: 0.5,
      filename: `vehicle_inspection_${inspectionData.vehicleInfo.year}_${inspectionData.vehicleInfo.make}_${inspectionData.vehicleInfo.model}_${inspectionData.inspectorInfo.date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getStatusIcon = (status) => {
    const statusInfo = INSPECTION_STATUSES[status];
    if (!statusInfo) return null;
    
    const Icon = statusInfo.icon;
    return <Icon className={`w-5 h-5 text-${statusInfo.color}-600`} />;
  };

  const InspectionItem = ({ categoryId, item }) => {
    const resultKey = `${categoryId}_${item.id}`;
    const currentStatus = inspectionData.inspectionResults[resultKey];
    const currentNote = inspectionData.notes[resultKey] || '';

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              {item.name}
              {item.critical && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  Critical
                </span>
              )}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Requirement: {item.requirement}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(currentStatus)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {Object.entries(INSPECTION_STATUSES).map(([status, info]) => (
            <button
              key={status}
              onClick={() => handleItemInspection(categoryId, item.id, status, currentNote)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStatus === status
                  ? `bg-${info.color}-100 text-${info.color}-800 border-2 border-${info.color}-300`
                  : `bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-${info.color}-50 border border-gray-200 dark:border-gray-600`
              }`}
            >
              <info.icon className="w-4 h-4" />
              {info.label}
            </button>
          ))}
        </div>

        <textarea
          value={currentNote}
          onChange={(e) => handleItemInspection(categoryId, item.id, currentStatus, e.target.value)}
          placeholder="Notes, measurements, or recommendations..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
          rows={2}
        />
      </div>
    );
  };

  const overallStatus = calculateOverallStatus();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Vehicle Safety Inspection Checklist
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive multi-point inspection report
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateInspectionReport}
              disabled={isGeneratingReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiFileText className="w-4 h-4" />
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={() => onSave?.(inspectionData)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <FiSave className="w-4 h-4" />
              Save Inspection
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <FiX className="w-4 h-4" />
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Inspection Categories
              </h3>
              <nav className="space-y-2">
                {Object.entries(INSPECTION_CATEGORIES).map(([catId, category]) => {
                  const Icon = category.icon;
                  const categoryResults = category.items.map(item => 
                    inspectionData.inspectionResults[`${catId}_${item.id}`]
                  ).filter(Boolean);
                  
                  const hasFails = categoryResults.includes('fail');
                  const hasAttention = categoryResults.includes('attention');
                  const allPass = categoryResults.length === category.items.length && 
                                 categoryResults.every(status => status === 'pass');
                  
                  return (
                    <button
                      key={catId}
                      onClick={() => setActiveCategory(catId)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeCategory === catId
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1 font-medium">{category.title}</span>
                      <div className="flex items-center gap-1">
                        {hasFails && <FiX className="w-4 h-4 text-red-500" />}
                        {hasAttention && <FiAlertTriangle className="w-4 h-4 text-yellow-500" />}
                        {allPass && <FiCheck className="w-4 h-4 text-green-500" />}
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Overall Status */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Overall Status</h4>
                <div className={`px-4 py-3 rounded-lg border-2 ${
                  overallStatus === 'pass' ? 'bg-green-50 border-green-200 text-green-800' :
                  overallStatus === 'fail' ? 'bg-red-50 border-red-200 text-red-800' :
                  overallStatus === 'conditional' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  overallStatus === 'attention' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                  'bg-gray-50 border-gray-200 text-gray-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {overallStatus === 'pass' && <FiCheck className="w-5 h-5" />}
                    {overallStatus === 'fail' && <FiX className="w-5 h-5" />}
                    {(overallStatus === 'conditional' || overallStatus === 'attention') && <FiAlertTriangle className="w-5 h-5" />}
                    {overallStatus === 'pending' && <FiClock className="w-5 h-5" />}
                    <span className="font-medium">
                      {overallStatus === 'pass' ? 'PASS' :
                       overallStatus === 'fail' ? 'FAIL' :
                       overallStatus === 'conditional' ? 'CONDITIONAL' :
                       overallStatus === 'attention' ? 'ATTENTION' :
                       'PENDING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Vehicle Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year
                  </label>
                  <input
                    type="text"
                    value={inspectionData.vehicleInfo.year}
                    onChange={(e) => handleVehicleInfoChange('year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    value={inspectionData.vehicleInfo.make}
                    onChange={(e) => handleVehicleInfoChange('make', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={inspectionData.vehicleInfo.model}
                    onChange={(e) => handleVehicleInfoChange('model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    VIN
                  </label>
                  <input
                    type="text"
                    value={inspectionData.vehicleInfo.vin}
                    onChange={(e) => handleVehicleInfoChange('vin', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mileage
                  </label>
                  <input
                    type="text"
                    value={inspectionData.vehicleInfo.mileage}
                    onChange={(e) => handleVehicleInfoChange('mileage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    value={inspectionData.vehicleInfo.licensePlate}
                    onChange={(e) => handleVehicleInfoChange('licensePlate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Inspector Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Inspector Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={inspectionData.inspectorInfo.name}
                    onChange={(e) => handleInspectorInfoChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Certification Number
                  </label>
                  <input
                    type="text"
                    value={inspectionData.inspectorInfo.certificationNumber}
                    onChange={(e) => handleInspectorInfoChange('certificationNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={inspectionData.inspectorInfo.date}
                    onChange={(e) => handleInspectorInfoChange('date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={inspectionData.inspectorInfo.location}
                    onChange={(e) => handleInspectorInfoChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Active Category Inspection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {activeCategory && INSPECTION_CATEGORIES[activeCategory] && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    {React.createElement(INSPECTION_CATEGORIES[activeCategory].icon, {
                      className: "w-6 h-6 text-blue-600"
                    })}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {INSPECTION_CATEGORIES[activeCategory].title}
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {INSPECTION_CATEGORIES[activeCategory].items.map((item) => (
                      <InspectionItem
                        key={item.id}
                        categoryId={activeCategory}
                        item={item}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Content */}
      <div className="hidden print:block">
        <div ref={printRef} className="bg-white p-8 print:p-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Vehicle Safety Inspection Report
            </h1>
            <p className="text-gray-600">
              Comprehensive Multi-Point Inspection
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehicle Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Year:</strong> {inspectionData.vehicleInfo.year}</p>
                <p><strong>Make:</strong> {inspectionData.vehicleInfo.make}</p>
                <p><strong>Model:</strong> {inspectionData.vehicleInfo.model}</p>
                <p><strong>VIN:</strong> {inspectionData.vehicleInfo.vin}</p>
                <p><strong>Mileage:</strong> {inspectionData.vehicleInfo.mileage}</p>
                <p><strong>License Plate:</strong> {inspectionData.vehicleInfo.licensePlate}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Inspector Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Inspector:</strong> {inspectionData.inspectorInfo.name}</p>
                <p><strong>Certification #:</strong> {inspectionData.inspectorInfo.certificationNumber}</p>
                <p><strong>Date:</strong> {inspectionData.inspectorInfo.date}</p>
                <p><strong>Location:</strong> {inspectionData.inspectorInfo.location}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Overall Status</h3>
            <div className={`inline-block px-4 py-2 rounded-lg font-bold ${
              overallStatus === 'pass' ? 'bg-green-100 text-green-800' :
              overallStatus === 'fail' ? 'bg-red-100 text-red-800' :
              overallStatus === 'conditional' ? 'bg-yellow-100 text-yellow-800' :
              overallStatus === 'attention' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {overallStatus === 'pass' ? 'PASS' :
               overallStatus === 'fail' ? 'FAIL' :
               overallStatus === 'conditional' ? 'CONDITIONAL' :
               overallStatus === 'attention' ? 'ATTENTION' :
               'PENDING'}
            </div>
          </div>

          {Object.entries(INSPECTION_CATEGORIES).map(([catId, category]) => (
            <div key={catId} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{category.title}</h3>
              <div className="space-y-2">
                {category.items.map((item) => {
                  const resultKey = `${catId}_${item.id}`;
                  const status = inspectionData.inspectionResults[resultKey];
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm border-b pb-2">
                      <div className="flex-1">
                        <span className="font-medium">{item.name}</span>
                        {item.critical && <span className="ml-2 text-red-600 text-xs">(Critical)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          status === 'pass' ? 'bg-green-100 text-green-800' :
                          status === 'fail' ? 'bg-red-100 text-red-800' :
                          status === 'attention' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {status ? INSPECTION_STATUSES[status]?.label : 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
