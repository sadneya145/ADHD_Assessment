import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  const token = localStorage.getItem('token');

  // ❌ Not logged in → redirect
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // ✅ Logged in → allow access
  return children;
};

export default ProtectedRoute;
