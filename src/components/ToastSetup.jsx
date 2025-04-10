import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

export default function ToastSetup() {
  return <ToastContainer position="top-right" autoClose={3000} />;
}
