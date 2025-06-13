import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

// Main app content (wrapped by AuthProvider)
const AppContent = () => {
  const [currentView, setCurrentView] = useState("login"); // 'login' or 'register'
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

  // Show dashboard if user is logged in
  if (isAuthenticated) {
    return <Dashboard />;
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
