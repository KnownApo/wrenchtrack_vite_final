/**
 * Utility functions for formatting and helpers.
 */

/**
 * Formats a numeric value as USD currency.
 * @param {number} value - The value to format.
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};