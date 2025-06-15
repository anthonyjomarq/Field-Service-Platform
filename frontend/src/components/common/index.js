import React from "react";

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  ...props
}) => (
  <button className={`btn btn-${variant} btn-${size}`} {...props}>
    {icon && <span className="btn-icon">{icon}</span>}
    {children}
  </button>
);

export const Card = ({ children, className = "" }) => (
  <div className={`card ${className}`}>{children}</div>
);
Card.Header = ({ children, actions }) => (
  <div className="card-header">
    <div className="card-title">{children}</div>
    {actions && <div className="card-actions">{actions}</div>}
  </div>
);
Card.Body = ({ children }) => <div className="card-body">{children}</div>;

export const Modal = ({ isOpen, onClose, children, title, size = "md" }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export const Input = ({ label, error, ...props }) => (
  <div className="form-group">
    {label && <label>{label}</label>}
    <input className="form-input" {...props} />
    {error && <span className="error-text">{error}</span>}
  </div>
);

export const Select = ({ label, options = [], ...props }) => (
  <div className="form-group">
    {label && <label>{label}</label>}
    <select className="form-select" {...props}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const SearchBar = ({ placeholder = "Search...", ...props }) => (
  <input
    type="search"
    className="search-bar"
    placeholder={placeholder}
    {...props}
  />
);

export const Spinner = ({ size = "md" }) => (
  <div className={`spinner spinner-${size}`}>Loading...</div>
);

export const ErrorMessage = ({ error, onRetry }) => (
  <div className="error-message">
    <span>{error}</span>
    {onRetry && (
      <button onClick={onRetry} className="btn-sm">
        Retry
      </button>
    )}
  </div>
);

// Components for CustomerList
export const CustomerCard = ({ customer, onEdit, onDelete }) => (
  <div className="customer-card">
    <h4>{customer.name}</h4>
    <p>{customer.email}</p>
    <p>{customer.phone}</p>
    <div className="card-actions">
      <button onClick={onEdit} className="btn-sm">
        Edit
      </button>
      <button onClick={onDelete} className="btn-sm btn-danger">
        Delete
      </button>
    </div>
  </div>
);

export const CustomerForm = ({ customer, onSave, onCancel }) => (
  <div className="customer-form">
    <h3>{customer ? "Edit" : "New"} Customer</h3>
    <p>Form placeholder - will be implemented in Phase 2</p>
    <div style={{ marginTop: "20px" }}>
      <button onClick={onCancel} className="btn btn-secondary">
        Cancel
      </button>
    </div>
  </div>
);

// Icon components
export const PlusIcon = () => <span>+</span>;

// Sidebar placeholder
export const Sidebar = ({ isOpen, user }) => (
  <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
    <div className="sidebar-content">
      <p>Welcome, {user?.firstName}!</p>
      {/* Add navigation items here */}
    </div>
  </aside>
);
