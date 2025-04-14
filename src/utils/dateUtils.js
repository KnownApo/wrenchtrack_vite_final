import { format, addDays, isBefore, isAfter } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
};

export const calculateDueDate = (date, terms = 30) => {
  return addDays(new Date(date), terms);
};

export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return isBefore(new Date(dueDate), new Date());
};

export const isUpcoming = (dueDate, warningDays = 7) => {
  if (!dueDate) return false;
  const warningDate = addDays(new Date(), warningDays);
  return isBefore(new Date(dueDate), warningDate) && isAfter(new Date(dueDate), new Date());
};
