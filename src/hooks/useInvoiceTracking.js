import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { 
  initializeTracking, 
  addMilestone, 
  markInvoiceCompleted, 
  MILESTONE_TYPES, 
  getTrackingSummary 
} from '../utils/invoiceTracking';

/**
 * Custom hook for managing invoice tracking
 * Provides functions to update invoice status, add payments, and manage tracking data
 */
export default function useInvoiceTracking(userId) {
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Update an invoice with tracking information
   */
  const updateInvoice = async (invoice, updates = {}, milestone = null, milestoneNotes = '', milestoneData = {}) => {
    if (!userId || !invoice?.id) {
      toast.error('Missing user ID or invoice information');
      return null;
    }

    setIsUpdating(true);
    try {
      const invoiceRef = doc(db, 'users', userId, 'invoices', invoice.id);
      
      // Initialize tracking if needed
      let updatedInvoice = { ...invoice };
      if (!updatedInvoice.tracking) {
        updatedInvoice = initializeTracking(updatedInvoice);
      }
      
      // Add milestone if provided
      if (milestone) {
        updatedInvoice = addMilestone(
          updatedInvoice,
          milestone,
          milestoneNotes,
          milestoneData
        );
      }
      
      // Merge with other updates
      const updateData = {
        ...updates,
        tracking: updatedInvoice.tracking,
        updatedAt: new Date()
      };
      
      // Update in Firestore
      await updateDoc(invoiceRef, updateData);
      
      // Return updated invoice
      return {
        ...updatedInvoice,
        ...updates
      };
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice: ' + error.message);
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Mark an invoice as completed (with or without payment)
   */
  const completeInvoice = async (invoice, isPaid = false, notes = '', amountPaid = 0) => {
    try {
      // Apply completion tracking
      const updatedInvoice = markInvoiceCompleted(invoice, isPaid, notes, amountPaid);
      
      // Update in Firestore
      const status = isPaid ? 'paid' : 'completed';
      const updateData = {
        status,
        completed: true,
        completedAt: new Date()
      };
      
      // If paid, add payment info
      if (isPaid || amountPaid > 0) {
        const previousPaid = parseFloat(invoice.paidAmount) || 0;
        const newPaidAmount = isPaid ? parseFloat(invoice.total) : previousPaid + parseFloat(amountPaid);
        
        updateData.paidAmount = newPaidAmount;
        if (isPaid) {
          updateData.paid = true;
          updateData.paidAt = new Date();
        }
      }
      
      return await updateInvoice(updatedInvoice, updateData);
    } catch (error) {
      console.error('Error completing invoice:', error);
      toast.error('Failed to complete invoice');
      return null;
    }
  };

  /**
   * Add a partial payment to an invoice
   */
  const addPayment = async (invoice, amount) => {
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return null;
    }
    
    try {
      // Initialize tracking if needed
      let updatedInvoice = { ...invoice };
      if (!updatedInvoice.tracking) {
        updatedInvoice = initializeTracking(updatedInvoice);
      }
      
      // Calculate new total paid amount
      const previousPaid = parseFloat(invoice.paidAmount) || 0;
      const newPaidAmount = previousPaid + parseFloat(amount);
      const total = parseFloat(invoice.total) || 0;
      
      // Determine if this payment completes the invoice
      const isFullyPaid = newPaidAmount >= total;
      const milestone = isFullyPaid ? MILESTONE_TYPES.PAYMENT_RECEIVED : MILESTONE_TYPES.PAYMENT_PARTIAL;
      const notes = isFullyPaid ? 'Payment received in full' : `Partial payment received: $${amount}`;
      
      // Update status based on payment
      const newStatus = isFullyPaid ? 'paid' : (invoice.status === 'completed' ? 'completed' : invoice.status);
      
      const updateData = {
        paidAmount: newPaidAmount,
        status: newStatus,
        ...(isFullyPaid ? { paid: true, paidAt: new Date() } : {})
      };
      
      return await updateInvoice(
        updatedInvoice, 
        updateData, 
        milestone, 
        notes, 
        { amountPaid: amount }
      );
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to add payment');
      return null;
    }
  };

  /**
   * Change the status of an invoice and add appropriate milestone
   */
  const changeStatus = async (invoice, newStatus) => {
    try {
      // Initialize tracking if needed
      let updatedInvoice = { ...invoice };
      if (!updatedInvoice.tracking) {
        updatedInvoice = initializeTracking(updatedInvoice);
      }
      
      // Handle status change based on target status
      switch (newStatus) {
        case 'completed':
          return await completeInvoice(updatedInvoice, false, 'Service completed by technician');
          
        case 'paid':
          if (updatedInvoice.status === 'completed') {
            // If already completed, just add payment
            return await addPayment(updatedInvoice, parseFloat(updatedInvoice.total || 0));
          } else {
            // Otherwise mark as completed AND paid
            return await completeInvoice(updatedInvoice, true, 'Service completed and payment received');
          }
          
        case 'pending':
          // Add a milestone for pending status if coming from another state
          if (updatedInvoice.tracking?.currentStage !== 'created') {
            return await updateInvoice(
              updatedInvoice,
              { status: newStatus },
              MILESTONE_TYPES.PARTS_ADDED,
              'Invoice updated and pending'
            );
          } else {
            return await updateInvoice(updatedInvoice, { status: newStatus });
          }
          
        default:
          // General status update
          return await updateInvoice(updatedInvoice, { status: newStatus });
      }
    } catch (error) {
      console.error('Error changing invoice status:', error);
      toast.error('Failed to change invoice status');
      return null;
    }
  };
  /**
   * Get tracking summary and status
   */
  const getTracking = (invoice) => {
    if (!invoice) return null;
    return getTrackingSummary(invoice);
  };
  
  /**
   * Mark an invoice as finished (closed)
   * This is used when an invoice is completely done and should be archived
   */
  const finishInvoice = async (invoice) => {
    try {
      // Check if invoice exists and is paid
      if (!invoice || invoice.status !== 'paid') {
        toast.error('Only paid invoices can be marked as finished');
        return null;
      }
      
      // Add a milestone for finishing the invoice
      return await updateInvoice(
        invoice,
        { 
          status: 'finished', 
          finished: true, 
          finishedAt: new Date(),
          active: false 
        },
        MILESTONE_TYPES.COMPLETED,
        'Invoice has been closed and marked as finished'
      );
    } catch (error) {
      console.error('Error finishing invoice:', error);
      toast.error('Failed to finish invoice');
      return null;
    }
  };

  return {
    isUpdating,
    updateInvoice,
    completeInvoice,
    addPayment,
    changeStatus,
    getTracking,
    finishInvoice
  };
} 