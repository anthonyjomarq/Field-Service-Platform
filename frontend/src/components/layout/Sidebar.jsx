import React from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export const Sidebar = ({ isOpen, user }) => {
  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "📊",
    },
    {
      path: "/customers",
      label: "Customers",
      icon: "👥",
    },
    {
      path: "/routes",
      label: "Route Planning",
      icon: "🗺️",
    },
    // Future menu items for other phases
    // {
    //   path: '/work-orders',
    //   label: 'Work Orders',
    //   icon: '📋'
    // },
    // {
    //   path: '/inventory',
    //   label: 'Inventory',
    //   icon: '📦'
    // },
    // {
    //   path: '/schedule',
    //   label: 'Schedule',
    //   icon: '📅'
    // },
  ];

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <h3>Field Service</h3>
        <p className="welcome-message">Welcome, {user?.firstName}!</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/settings" className="nav-link settings-link">
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};
