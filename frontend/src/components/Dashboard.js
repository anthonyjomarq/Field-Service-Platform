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

      {/* System Status */}
      <div className="status-section">
        <h3>System Status:</h3>
        <div className="status-grid">
          <div className="status-item">
            <div className="status-indicator green"></div>
            <span>Customer Management</span>
            <span className="status-text">Active</span>
          </div>
          <div className="status-item">
            <div className="status-indicator yellow"></div>
            <span>Route Planning</span>
            <span className="status-text">In Development</span>
          </div>
          <div className="status-item">
            <div className="status-indicator yellow"></div>
            <span>Work Orders</span>
            <span className="status-text">Coming Soon</span>
          </div>
          <div className="status-item">
            <div className="status-indicator green"></div>
            <span>User Authentication</span>
            <span className="status-text">Active</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <button onClick={handleLogout} className="btn logout-btn">
          Logout
        </button>
      </div>

      <style jsx>{`
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .action-btn {
          padding: 15px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .action-btn.primary {
          background: #007bff;
          color: white;
          box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
        }

        .action-btn.primary:hover {
          background: #0056b3;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 123, 255, 0.4);
        }

        .action-btn.secondary {
          background: #f8f9fa;
          color: #6c757d;
          border: 2px dashed #dee2e6;
        }

        .action-btn.secondary:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .status-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .status-section h3 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-indicator.green {
          background: #28a745;
          box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.2);
        }

        .status-indicator.yellow {
          background: #ffc107;
          box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.2);
        }

        .status-indicator.red {
          background: #dc3545;
          box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2);
        }

        .status-item span:nth-child(2) {
          font-weight: 500;
          flex: 1;
        }

        .status-text {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          font-weight: 500;
        }

        .logout-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .logout-btn:hover {
          background: #c82333;
        }

        @media (max-width: 768px) {
          .quick-actions {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: 1fr;
          }

          .action-btn {
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
