import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import CustomerDetail from "./components/customers/CustomerDetail";
import CustomerForm from "./components/customers/CustomerForm";
import CustomerList from "./components/customers/CustomerList";
import Dashboard from "./components/Dashboard";
import { Layout } from "./components/layout/Layout";
import Login from "./components/Login";
import Register from "./components/Register";
import RoutePlanner from "./components/routes/RoutePlanner";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/new" element={<CustomerForm />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/customers/:id/edit" element={<CustomerForm />} />

              {/* Route Planning */}
              <Route path="/routes" element={<RoutePlanner />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
