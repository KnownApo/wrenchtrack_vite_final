/**
 * Helper function to create notifications from application events
 */

export const createNotificationFromInvoice = (invoice) => {
  if (!invoice) return null;
  
  let notification = {
    id: `inv-note-${invoice.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  
  if (invoice.status === 'paid') {
    notification = {
      ...notification,
      title: 'Payment Received',
      text: `Invoice #${invoice.invoiceNumber || invoice.id} paid - $${invoice.total.toFixed(2)}`,
      type: 'success'
    };
  } else if (invoice.status === 'created' || invoice.status === 'draft') {
    notification = {
      ...notification,
      title: 'New Invoice Created',
      text: `Invoice #${invoice.invoiceNumber || invoice.id} created for ${invoice.customer?.name || 'Customer'}`,
      type: 'info'
    };
  } else if (invoice.status === 'overdue') {
    notification = {
      ...notification,
      title: 'Invoice Overdue',
      text: `Invoice #${invoice.invoiceNumber || invoice.id} is overdue ($${invoice.total.toFixed(2)})`,
      type: 'warning'
    };
  }
  
  return notification;
};

export const createNotificationFromInventory = (part) => {
  if (!part) return null;
  
  // Example for low inventory alert
  if (part.quantity <= part.reorderLevel) {
    return {
      id: `part-note-${part.id}-${Date.now()}`,
      title: 'Low Inventory Alert',
      text: `${part.name} is running low (${part.quantity} remaining)`,
      type: 'warning',
      timestamp: new Date().toISOString(),
      read: false
    };
  }
  
  return null;
};

export const createNotificationFromCustomer = (customer, action = 'added') => {
  if (!customer) return null;
  
  let notification = {
    id: `cust-note-${customer.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'info'
  };
  
  switch (action) {
    case 'added':
      notification.title = 'New Customer Added';
      notification.text = `${customer.name} has been added to your customer database`;
      break;
    case 'updated':
      notification.title = 'Customer Updated';
      notification.text = `${customer.name}'s information has been updated`;
      break;
    case 'appointment':
      notification.title = 'New Appointment';
      notification.text = `${customer.name} scheduled a new appointment`;
      notification.type = 'success';
      break;
    default:
      return null;
  }
  
  return notification;
};

export const createSystemNotification = (title, message, type = 'info') => {
  return {
    id: `sys-note-${Date.now()}`,
    title,
    text: message,
    type,
    timestamp: new Date().toISOString(),
    read: false
  };
};
