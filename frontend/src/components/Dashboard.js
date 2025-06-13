import React from "react";
import { useAuth } from "../contexts/AuthContext";

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="container">
      <h2>Welcome to Field Service Platform!</h2>

      <div className="success">
        Hello, {user?.firstName} {user?.lastName}! You are logged in as:{" "}
        <strong>{user?.role}</strong>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Your Profile:</h3>
        <p>
          <strong>Email:</strong> {user?.email}
        </p>
        <p>
          <strong>Role:</strong> {user?.role}
        </p>
        <p>
          <strong>ID:</strong> {user?.id}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Available Features:</h3>
        <ul>
          <li>✅ User Authentication</li>
          <li>🔄 Route Optimization (coming soon...)</li>
          <li>👥 Customer Management (coming soon...)</li>
          <li>📋 Work Orders (coming soon...)</li>
        </ul>
      </div>

      <button
        onClick={() => (window.location.hash = "customers")}
        className="btn"
        style={{ width: "auto", marginRight: "10px" }}
      >
        Manage Customers
      </button>

      <button onClick={handleLogout} className="btn">
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
