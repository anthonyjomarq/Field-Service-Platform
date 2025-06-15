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
          <li>
            ✅ <strong>User Authentication</strong> - Secure login and role
            management
          </li>
          <li>
            ✅ <strong>Customer Management</strong> - Add, edit, and organize
            your customers
          </li>
          <li>
            🔄 <strong>Route Optimization</strong> - Coming soon! Smart route
            planning and navigation
          </li>
          <li>
            🔄 <strong>Work Orders</strong> - Coming soon! Job scheduling and
            tracking
          </li>
          <li>
            🔄 <strong>Equipment Management</strong> - Coming soon! Track and
            maintain equipment
          </li>
          <li>
            🔄 <strong>Reporting & Analytics</strong> - Coming soon! Business
            insights and performance metrics
          </li>
        </ul>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h3>Quick Actions:</h3>
        <div className="quick-actions">
          <button
            onClick={() => (window.location.hash = "customers")}
            className="action-btn primary"
          >
            📋 Manage Customers
          </button>

          <button
            onClick={() =>
              alert(
                "Route planning coming soon! Use the Route Planning tab to see what's planned."
              )
            }
            className="action-btn secondary"
          >
            🚛 Plan Routes (Coming Soon)
          </button>

          <button
            onClick={() => alert("Work orders feature will be available soon!")}
            className="action-btn secondary"
          >
            📝 Create Work Order (Coming Soon)
          </button>
        </div>
      </div>

      <button onClick={handleLogout} className="btn danger">
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
