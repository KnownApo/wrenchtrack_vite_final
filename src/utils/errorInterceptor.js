import { auth } from '../firebase';
import { toast } from 'react-toastify';

// State management for token refresh
const state = {
  isRefreshing: false,
  failedQueue: []
};

const processQueue = (error) => {
  state.failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  state.failedQueue = [];
};

export const handlePermissionError = async (error) => {
  if (error.code === 'permission-denied' && auth.currentUser) {    if (state.isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        state.failedQueue.push({ resolve, reject });
      });
    }

    state.isRefreshing = true;

    try {
      await auth.currentUser.getIdToken(true);
      processQueue(null);
      return true;
    } catch (refreshError) {
      processQueue(refreshError);
      toast.error('Please try logging out and back in to refresh your permissions.', {
        toastId: 'auth-refresh-error',
        autoClose: 5000
      });      return false;
    } finally {
      state.isRefreshing = false;
    }
  }
  return false;
};

export const attachErrorHandler = () => {
  // Attach to unhandled promise rejections
  window.addEventListener('unhandledrejection', async (event) => {
    const error = event.reason;
    if (error?.code === 'permission-denied') {
      event.preventDefault();
      await handlePermissionError(error);
    }
  });
};
