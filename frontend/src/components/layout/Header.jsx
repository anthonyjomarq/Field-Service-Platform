import React from "react";

import { useAuth } from "../../contexts/AuthContext";

// Temporary
const useNotifications = () => ({ notifications: [] });

export const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications } = useNotifications();

  return (
    <header className="app-header">
      <button className="menu-toggle" onClick={onToggleSidebar}>
        ☰
      </button>

      <h1 className="app-title">Field Service Platform</h1>

      <div className="header-actions">
        <button className="notification-btn">
          🔔{" "}
          {notifications.length > 0 && (
            <span className="badge">{notifications.length}</span>
          )}
        </button>

        <div className="user-menu">
          <span>
            {user?.firstName} {user?.lastName}
          </span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  );
};
