/**
 * Invoice numbering utilities
 * Handles invoice number generation, PO number management, and business info
 */

/**
 * Generate a random 8-digit number
 * @returns {string} Random 8-digit number
 */
export const generateRandom8Digits = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

/**
 * Generate a random PO number (8 characters alphanumeric)
 * @returns {string} Random PO number
 */
export const generatePONumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Get abbreviated business name (first 3 letters)
 * @param {Object} businessInfo - Business information object
 * @returns {string} Abbreviated business name, uppercase
 */
export const getBusinessAbbreviation = (businessInfo) => {
  if (!businessInfo || !businessInfo.businessName) {
    return 'BIZ'; // Default abbreviation
  }
  
  // Remove spaces and special characters, take first 3 letters
  const cleanName = businessInfo.businessName.replace(/[^A-Za-z]/g, '');
  return cleanName.substring(0, 3).toUpperCase() || 'BIZ';
};

/**
 * Generate a complete invoice number in format: ABC-12345678-PO123456
 * @param {Object} businessInfo - Business information object
 * @param {string} poNumber - PO number (optional, will generate if not provided)
 * @param {string} existingNumber - Existing invoice number (for editing)
 * @returns {Object} Invoice number components
 */
export const generateInvoiceNumber = (businessInfo, poNumber = null, existingNumber = null) => {
  if (existingNumber) {
    // Parse existing number to maintain consistency
    const parsed = parseInvoiceNumber(existingNumber);
    if (parsed) {
      return {
        fullNumber: existingNumber,
        baseNumber: `${parsed.businessAbbr}-${parsed.randomDigits}`,
        poNumber: parsed.poNumber,
        businessAbbr: parsed.businessAbbr,
        randomDigits: parsed.randomDigits
      };
    }
  }
  
  const businessAbbr = getBusinessAbbreviation(businessInfo);
  const randomDigits = generateRandom8Digits();
  const generatedPO = poNumber || generatePONumber();
  
  const baseNumber = `${businessAbbr}-${randomDigits}`;
  const fullNumber = `${baseNumber}-${generatedPO}`;
  
  return {
    fullNumber,
    baseNumber,
    poNumber: generatedPO,
    businessAbbr,
    randomDigits
  };
};

/**
 * Parse invoice number components
 * @param {string} invoiceNumber - Full invoice number
 * @returns {Object} Parsed components
 */
export const parseInvoiceNumber = (invoiceNumber) => {
  if (!invoiceNumber) return null;
  
  const parts = invoiceNumber.split('-');
  if (parts.length < 2) return null;
  
  if (parts.length === 2) {
    // Format: ABC-12345678 (no PO number)
    return {
      businessAbbr: parts[0],
      randomDigits: parts[1],
      poNumber: null,
      baseNumber: invoiceNumber,
      fullNumber: invoiceNumber
    };
  } else if (parts.length === 3) {
    // Format: ABC-12345678-PO123456
    return {
      businessAbbr: parts[0],
      randomDigits: parts[1],
      poNumber: parts[2],
      baseNumber: `${parts[0]}-${parts[1]}`,
      fullNumber: invoiceNumber
    };
  }
  
  return null;
};

/**
 * Validate invoice number format
 * @param {string} invoiceNumber - Invoice number to validate
 * @returns {boolean} Whether the format is valid
 */
export const validateInvoiceNumber = (invoiceNumber) => {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') return false;
  
  // Format: ABC-12345678 or ABC-12345678-PO123456
  const pattern = /^[A-Z]{3}-\d{8}(-[A-Z0-9]{8})?$/;
  return pattern.test(invoiceNumber);
};

/**
 * Format invoice number for display
 * @param {string} invoiceNumber - Invoice number
 * @returns {string} Formatted invoice number
 */
export const formatInvoiceNumber = (invoiceNumber) => {
  if (!invoiceNumber) return 'N/A';
  
  const parsed = parseInvoiceNumber(invoiceNumber);
  if (!parsed) return invoiceNumber;
  
  return parsed.fullNumber;
};

/**
 * Generate invoice display name with PO number
 * @param {string} invoiceNumber - Invoice number
 * @param {string} poNumber - PO number
 * @returns {string} Display name
 */
export const getInvoiceDisplayName = (invoiceNumber, poNumber) => {
  const parsed = parseInvoiceNumber(invoiceNumber);
  if (!parsed) return invoiceNumber || 'N/A';
  
  if (poNumber && !parsed.poNumber) {
    return `${parsed.baseNumber}-${poNumber}`;
  }
  
  return parsed.fullNumber;
};

/**
 * Generate random sequence for various uses
 * @param {number} length - Length of the sequence
 * @returns {string} Random sequence
 */
export const generateRandomSequence = (length = 9) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
