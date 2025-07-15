/**
 * Safely converts various timestamp formats to Date objects
 * Handles Firestore Timestamps, Date objects, strings, and numbers
 * @param {any} timestamp - The timestamp to convert
 * @returns {Date} A valid Date object
 */
export const safeToDate = (timestamp) => {
  if (!timestamp) return new Date();
  
  // Firestore Timestamp object
  if (typeof timestamp?.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // String or number timestamp
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  // Fallback to current date
  return new Date();
};

/**
 * Safely converts Firestore document data with timestamp fields
 * @param {Object} docData - The document data from Firestore
 * @param {string[]} timestampFields - Array of field names that should be converted to dates
 * @returns {Object} Document data with converted timestamps
 */
export const safeConvertDocData = (docData, timestampFields = ['createdAt', 'updatedAt']) => {
  const convertedData = { ...docData };
  
  timestampFields.forEach(field => {
    if (docData[field]) {
      convertedData[field] = safeToDate(docData[field]);
    }
  });
  
  return convertedData;
};

/**
 * Formats a date for display
 * @param {Date|any} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  const safeDate = safeToDate(date);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(safeDate);
};

/**
 * Formats a date for display in a short format
 * @param {Date|any} date - The date to format
 * @returns {string} Formatted date string (MM/DD/YYYY)
 */
export const formatDateShort = (date) => {
  const safeDate = safeToDate(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(safeDate);
};

/**
 * Formats a date for display with time
 * @param {Date|any} date - The date to format
 * @returns {string} Formatted date string with time
 */
export const formatDateTime = (date) => {
  const safeDate = safeToDate(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(safeDate);
};
