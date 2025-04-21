/**
 * Invoice Completion Tracking System
 * 
 * This utility provides an innovative approach to track invoice completion status
 * using timestamps, milestones, and stage tracking.
 */

// Constants for tracking stages and milestones
const COMPLETION_STAGES = {
  CREATED: 'created',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PAID: 'paid',
  ARCHIVED: 'archived'
};

const MILESTONE_TYPES = {
  CREATED: 'created',
  PARTS_ADDED: 'parts_added',
  SERVICE_COMPLETED: 'service_completed',
  CUSTOMER_APPROVED: 'customer_approved',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_PARTIAL: 'payment_partial',
  ARCHIVED: 'archived'
};

/**
 * Creates a milestone object with timestamp and optional notes
 * 
 * @param {string} type - Milestone type from MILESTONE_TYPES
 * @param {string} notes - Optional notes about the milestone
 * @param {Object} data - Optional additional data for the milestone
 * @returns {Object} Milestone object
 */
const createMilestone = (type, notes = '', data = {}) => {
  return {
    type,
    timestamp: new Date(),
    notes,
    data
  };
};

/**
 * Initializes tracking for a new invoice with created milestone
 * 
 * @param {Object} invoice - The invoice object
 * @returns {Object} Invoice with tracking data
 */
const initializeTracking = (invoice) => {
  const trackingData = {
    currentStage: COMPLETION_STAGES.CREATED,
    milestones: [
      createMilestone(MILESTONE_TYPES.CREATED, 'Invoice created')
    ],
    completionPercentage: 0,
    paymentPercentage: 0,
    lastUpdated: new Date()
  };
  
  return {
    ...invoice,
    tracking: trackingData
  };
};

/**
 * Adds a milestone to an invoice's tracking data
 * 
 * @param {Object} invoice - The invoice object with tracking data
 * @param {string} milestoneType - The type of milestone from MILESTONE_TYPES
 * @param {string} notes - Optional notes about the milestone
 * @param {Object} data - Optional additional data for the milestone
 * @returns {Object} Updated invoice with new milestone
 */
const addMilestone = (invoice, milestoneType, notes = '', data = {}) => {
  if (!invoice.tracking) {
    invoice = initializeTracking(invoice);
  }
  
  const milestone = createMilestone(milestoneType, notes, data);
  const updatedMilestones = [...invoice.tracking.milestones, milestone];
  
  // Update stage based on milestone
  let currentStage = invoice.tracking.currentStage;
  let completionPercentage = calculateCompletionPercentage(updatedMilestones);
  let paymentPercentage = calculatePaymentPercentage(invoice, data);
  
  // Update stage based on milestone type
  switch (milestoneType) {
    case MILESTONE_TYPES.SERVICE_COMPLETED:
      currentStage = COMPLETION_STAGES.COMPLETED;
      break;
    case MILESTONE_TYPES.PAYMENT_RECEIVED:
      currentStage = COMPLETION_STAGES.PAID;
      break;
    case MILESTONE_TYPES.PAYMENT_PARTIAL:
      // Keep current stage, just update payment percentage
      break;
    case MILESTONE_TYPES.ARCHIVED:
      currentStage = COMPLETION_STAGES.ARCHIVED;
      break;
  }
  
  return {
    ...invoice,
    tracking: {
      ...invoice.tracking,
      milestones: updatedMilestones,
      currentStage,
      completionPercentage,
      paymentPercentage,
      lastUpdated: new Date()
    }
  };
};

/**
 * Calculates completion percentage based on milestones
 * 
 * @param {Array} milestones - Array of milestone objects
 * @returns {number} Completion percentage (0-100)
 */
const calculateCompletionPercentage = (milestones) => {
  // Define milestone weights for completion calculation
  const weights = {
    [MILESTONE_TYPES.CREATED]: 10,
    [MILESTONE_TYPES.PARTS_ADDED]: 30,
    [MILESTONE_TYPES.SERVICE_COMPLETED]: 60,
    [MILESTONE_TYPES.CUSTOMER_APPROVED]: 100
  };
  
  let maxPercentage = 0;
  
  // Find the highest weighted milestone achieved
  milestones.forEach(milestone => {
    const weight = weights[milestone.type] || 0;
    if (weight > maxPercentage) {
      maxPercentage = weight;
    }
  });
  
  return maxPercentage;
};

/**
 * Calculates payment percentage based on amount paid vs total
 * 
 * @param {Object} invoice - The invoice object
 * @param {Object} data - Optional payment data from milestone
 * @returns {number} Payment percentage (0-100)
 */
const calculatePaymentPercentage = (invoice, data = {}) => {
  // Get total amount from invoice
  const totalAmount = parseFloat(invoice.total) || 0;
  if (totalAmount === 0) return 0;
  
  // Calculate from payment milestone data if provided
  if (data.amountPaid) {
    return Math.min(100, (parseFloat(data.amountPaid) / totalAmount) * 100);
  }
  
  // Try to get from invoice.paidAmount
  if (invoice.paidAmount) {
    return Math.min(100, (parseFloat(invoice.paidAmount) / totalAmount) * 100);
  }
  
  // Return current tracking value if exists, otherwise 0
  return invoice.tracking?.paymentPercentage || 0;
};

/**
 * Gets a summary of invoice completion and payment status
 * 
 * @param {Object} invoice - The invoice object with tracking data
 * @returns {Object} Status summary object
 */
const getTrackingSummary = (invoice) => {
  if (!invoice.tracking) return null;
  
  const { currentStage, completionPercentage, paymentPercentage, milestones } = invoice.tracking;
  
  // Calculate time metrics
  const createdAt = milestones.find(m => m.type === MILESTONE_TYPES.CREATED)?.timestamp;
  const completedAt = milestones.find(m => m.type === MILESTONE_TYPES.SERVICE_COMPLETED)?.timestamp;
  const paidAt = milestones.find(m => m.type === MILESTONE_TYPES.PAYMENT_RECEIVED)?.timestamp;
  
  let timeToComplete = null;
  let timeToPay = null;
  
  if (createdAt && completedAt) {
    timeToComplete = completedAt - createdAt; // in milliseconds
  }
  
  if (completedAt && paidAt) {
    timeToPay = paidAt - completedAt; // in milliseconds
  }
  
  // Determine detailed status
  let detailedStatus = 'pending';
  if (currentStage === COMPLETION_STAGES.COMPLETED && paymentPercentage < 100) {
    detailedStatus = 'completed_unpaid';
  } else if (currentStage === COMPLETION_STAGES.COMPLETED && paymentPercentage === 100) {
    detailedStatus = 'completed_paid';
  } else if (currentStage === COMPLETION_STAGES.PAID) {
    detailedStatus = 'paid';
  } else if (currentStage === COMPLETION_STAGES.ARCHIVED) {
    detailedStatus = 'archived';
  }
  
  const lastMilestone = milestones[milestones.length - 1];
  
  return {
    status: detailedStatus,
    stage: currentStage,
    completionPercentage,
    paymentPercentage,
    timeToComplete,
    timeToPay,
    lastActivity: {
      type: lastMilestone.type,
      timestamp: lastMilestone.timestamp,
      description: lastMilestone.notes
    },
    milestoneCount: milestones.length
  };
};

/**
 * Gets a user-friendly status label and color
 * 
 * @param {Object} invoice - The invoice object with tracking data
 * @returns {Object} Status object with label, color class, and icon type
 */
const getTrackingStatus = (invoice) => {
  const summary = getTrackingSummary(invoice);
  if (!summary) {
    return {
      label: 'Pending',
      colorClass: 'bg-yellow-100 text-yellow-800',
      iconType: 'clock'
    };
  }
  
  switch (summary.status) {
    case 'completed_unpaid':
      return {
        label: 'Completed (Unpaid)',
        colorClass: 'bg-indigo-100 text-indigo-800',
        iconType: 'check_unpaid'
      };
    case 'completed_paid':
      return {
        label: 'Completed (Paid)',
        colorClass: 'bg-green-100 text-green-800',
        iconType: 'check_paid'
      };
    case 'paid':
      return {
        label: 'Paid',
        colorClass: 'bg-green-100 text-green-800',
        iconType: 'money'
      };
    case 'archived':
      return {
        label: 'Archived',
        colorClass: 'bg-gray-100 text-gray-800',
        iconType: 'archive'
      };
    default:
      return {
        label: 'Pending',
        colorClass: 'bg-yellow-100 text-yellow-800',
        iconType: 'clock'
      };
  }
};

/**
 * Marks an invoice as completed with optional notes and payment information
 * 
 * @param {Object} invoice - The invoice object
 * @param {boolean} isPaid - Whether payment was received
 * @param {string} notes - Optional notes about completion
 * @param {number} amountPaid - Optional amount paid if partial payment
 * @returns {Object} Updated invoice with completion tracking
 */
const markInvoiceCompleted = (invoice, isPaid = false, notes = '', amountPaid = 0) => {
  // First add service completed milestone
  let updatedInvoice = addMilestone(
    invoice, 
    MILESTONE_TYPES.SERVICE_COMPLETED,
    notes || 'Service completed'
  );
  
  // If also paid, add payment received milestone
  if (isPaid) {
    updatedInvoice = addMilestone(
      updatedInvoice,
      MILESTONE_TYPES.PAYMENT_RECEIVED,
      'Payment received in full',
      { amountPaid: invoice.total }
    );
  } else if (amountPaid > 0) {
    // If partial payment
    updatedInvoice = addMilestone(
      updatedInvoice,
      MILESTONE_TYPES.PAYMENT_PARTIAL,
      `Partial payment received: ${amountPaid}`,
      { amountPaid }
    );
  }
  
  return updatedInvoice;
};

export {
  COMPLETION_STAGES,
  MILESTONE_TYPES,
  initializeTracking,
  addMilestone,
  getTrackingSummary,
  getTrackingStatus,
  markInvoiceCompleted
}; 