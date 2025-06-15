import React, { useState } from "react";

import CustomerList from "./components/customers/CustomerList";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import RoutePlanner from "./components/routes/RoutePlanner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Main app content (wrapped by AuthProvider)
const AppContent = () => {
  const [currentView, setCurrentView] = useState("login");
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="container">
        <h2>Loading...</h2>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  // Show dashboard or other authenticated views if user is logged in
  if (isAuthenticated) {
    // Navigation header for authenticated users
    const renderHeader = () => (
      <div
        style={{
          background: "#007bff",
          padding: "10px 20px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "15px" }}>
          <button
            onClick={() => setCurrentView("dashboard")}
            style={{
              background:
                currentView === "dashboard" ? "#0056b3" : "transparent",
              color: "white",
              border: "1px solid white",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView("customers")}
            style={{
              background:
                currentView === "customers" ? "#0056b3" : "transparent",
              color: "white",
              border: "1px solid white",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Customers
          </button>

          <button
            onClick={() => setCurrentView("routes")}
            style={{
              background: currentView === "routes" ? "#0056b3" : "transparent",
              color: "white",
              border: "1px solid white",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Route Planning
          </button>
        </div>
        <h2 style={{ color: "white", margin: 0 }}>Field Service Platform</h2>
      </div>
    );

    return (
      <>
        {renderHeader()}
        {currentView === "dashboard" && <Dashboard />}
        {currentView === "customers" && <CustomerList />}
        {currentView === "routes" && <RoutePlanner />}
      </>
    );
  }

  // Show login/register forms if not logged in
  return (
    <>
      {currentView === "login" ? (
        <Login
          onSwitchToRegister={() => setCurrentView("register")}
          onLoginSuccess={() => setCurrentView("dashboard")}
        />
      ) : (
        <Register
          onSwitchToLogin={() => setCurrentView("login")}
          onRegisterSuccess={() => setCurrentView("dashboard")}
        />
      )}
    </>
  );
};

// Main App component with AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;
