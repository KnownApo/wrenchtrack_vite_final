import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AuthGuard({ children }) {
  const { user } = useAuth() || {};
  return user ? children : <Navigate to="/login" replace />;
}
