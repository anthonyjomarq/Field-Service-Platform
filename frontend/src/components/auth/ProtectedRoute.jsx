import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // User doesn't have the required role
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
