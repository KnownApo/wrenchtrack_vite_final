import React, { useState } from 'react';
import { FiFileText, FiEye, FiCopy, FiStar } from 'react-icons/fi';

const INVOICE_TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard Invoice',
    description: 'Clean, professional invoice template',
    preview: '/templates/standard-preview.jpg',
    popular: true,
    category: 'Business'
  },
  {
    id: 'modern',
    name: 'Modern Design',
    description: 'Contemporary invoice with bold colors',
    preview: '/templates/modern-preview.jpg',
    popular: false,
    category: 'Creative'
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    description: 'Simple, clean design with minimal elements',
    preview: '/templates/minimal-preview.jpg',
    popular: true,
    category: 'Simple'
  },
  {
    id: 'automotive',
    name: 'Automotive Service',
    description: 'Specialized template for automotive services',
    preview: '/templates/automotive-preview.jpg',
    popular: false,
    category: 'Industry'
  },
  {
    id: 'corporate',
    name: 'Corporate Blue',
    description: 'Professional corporate-style invoice',
    preview: '/templates/corporate-preview.jpg',
    popular: false,
    category: 'Business'
  },
  {
    id: 'creative',
    name: 'Creative Studio',
    description: 'Colorful template for creative businesses',
    preview: '/templates/creative-preview.jpg',
    popular: false,
    category: 'Creative'
  }
];

export default function InvoiceTemplates({ onSelectTemplate, currentTemplate = 'standard' }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', 'Business', 'Creative', 'Simple', 'Industry'];

  const filteredTemplates = INVOICE_TEMPLATES.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (templateId) => {
    onSelectTemplate(templateId);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Templates</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTemplates.length} templates available
          </span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`bg-white dark:bg-gray-700 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
              currentTemplate === template.id
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            {/* Template Preview */}
            <div className="relative h-48 bg-gray-100 dark:bg-gray-600 rounded-t-lg flex items-center justify-center">
              <FiFileText className="w-12 h-12 text-gray-400" />
              {template.popular && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <FiStar className="w-3 h-3" />
                  Popular
                </div>
              )}
              {currentTemplate === template.id && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Current
                </div>
              )}
            </div>

            {/* Template Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                <span className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateSelect(template.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <FiCopy className="w-4 h-4" />
                  {currentTemplate === template.id ? 'Selected' : 'Use Template'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Preview functionality
                  }}
                  className="p-2 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                  title="Preview"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No templates found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
