import React, { useState, useEffect } from "react";
import { customerAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import CustomerFormModal from "./CustomerFormModal";

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formMode, setFormMode] = useState("create");

  // Customer details modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Delete confirmation
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { user } = useAuth();

  // Load customers when component mounts or filters change
  useEffect(() => {
    loadCustomers();
  }, [searchTerm, filterType]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      if (searchTerm) filters.search = searchTerm;
      if (filterType) filters.customerType = filterType;

      console.log("🔄 Loading customers with filters:", filters);
      const response = await customerAPI.getCustomers(filters);
      console.log("✅ Customers loaded:", response.customers.length);
      setCustomers(response.customers);
    } catch (err) {
      setError("Failed to load customers: " + err.message);
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    setFormMode("create");
    setShowFormModal(true);
  };

  const handleEditCustomer = async (customer) => {
    try {
      console.log("✏️ Editing customer:", customer.id);
      // Get full customer details including locations
      const fullCustomer = await customerAPI.getCustomer(customer.id);
      console.log("📄 Full customer data:", fullCustomer);
      setEditingCustomer(fullCustomer);
      setFormMode("edit");
      setShowFormModal(true);
    } catch (err) {
      setError("Failed to load customer details: " + err.message);
    }
  };

  // **FIX 2: Enhanced handleCustomerSaved to reload customer list and ensure fresh data**
  const handleCustomerSaved = async (savedCustomer) => {
    console.log("💾 Customer saved:", savedCustomer);

    try {
      // **CRITICAL: Reload the entire customer list to get fresh data with updated counts**
      console.log("🔄 Reloading customer list after save...");
      await loadCustomers();

      // Optional: Also update the specific customer in state if we want immediate feedback
      if (formMode === "create") {
        console.log("✅ New customer created, list reloaded");
      } else {
        console.log("✅ Customer updated, list reloaded with fresh counts");
      }
    } catch (err) {
      console.error("❌ Error reloading customers after save:", err);
      // Fallback: Still update the local state if reload fails
      if (formMode === "create") {
        setCustomers((prev) => [savedCustomer, ...prev]);
      } else {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === savedCustomer.id ? { ...c, ...savedCustomer } : c
          )
        );
      }
    }
  };

  const handleViewCustomer = async (customer) => {
    try {
      console.log("👁️ Viewing customer:", customer.id);
      // Get full customer details for the details modal
      const fullCustomer = await customerAPI.getCustomer(customer.id);
      console.log("📄 Customer details:", fullCustomer);
      setSelectedCustomer(fullCustomer);
      setShowDetailsModal(true);
    } catch (err) {
      setError("Failed to load customer details: " + err.message);
    }
  };

  const handleDeleteClick = (customer) => {
    setDeletingCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      console.log("🗑️ Deleting customer:", deletingCustomer.id);
      await customerAPI.deleteCustomer(deletingCustomer.id);

      // **Reload customer list after deletion**
      await loadCustomers();

      setShowDeleteModal(false);
      setDeletingCustomer(null);

      console.log("✅ Customer deleted and list reloaded");
    } catch (err) {
      setError("Failed to delete customer: " + err.message);
    }
  };

  const clearError = () => setError("");

  return (
    <div className="customer-list-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <h2>Customers Management ({customers.length})</h2>
          <button onClick={handleCreateCustomer} className="primary-btn">
            Add Customer
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearError} className="close-error">
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filters-content">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="commercial">Commercial</option>
              <option value="residential">Residential</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="loading">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="no-customers">
          <p>No customers found.</p>
          <button onClick={handleCreateCustomer} className="primary-btn">
            Add Your First Customer
          </button>
        </div>
      ) : (
        <div className="customers-grid">
          {customers.map((customer) => (
            <div key={customer.id} className="customer-card">
              <div className="customer-header">
                <h3>{customer.name}</h3>
                <span className="customer-type">{customer.customer_type}</span>
              </div>

              <div className="customer-info">
                {/* **FIX: Display multiple emails and phones properly** */}
                {customer.emails && customer.emails.length > 0 ? (
                  <div className="contact-info">
                    <strong>Email:</strong> {customer.emails[0]}
                    {customer.emails.length > 1 && (
                      <span className="contact-count">
                        {" "}
                        + {customer.emails.length - 1} more
                      </span>
                    )}
                  </div>
                ) : customer.email ? (
                  <div className="contact-info">
                    <strong>Email:</strong> {customer.email}
                  </div>
                ) : (
                  <div className="contact-info">
                    <strong>Email:</strong> Not provided
                  </div>
                )}

                {customer.phones && customer.phones.length > 0 ? (
                  <div className="contact-info">
                    <strong>Phone:</strong> {customer.phones[0]}
                    {customer.phones.length > 1 && (
                      <span className="contact-count">
                        {" "}
                        + {customer.phones.length - 1} more
                      </span>
                    )}
                  </div>
                ) : customer.phone ? (
                  <div className="contact-info">
                    <strong>Phone:</strong> {customer.phone}
                  </div>
                ) : (
                  <div className="contact-info">
                    <strong>Phone:</strong> Not provided
                  </div>
                )}

                {customer.business_type && (
                  <div className="contact-info">
                    <strong>Business:</strong> {customer.business_type}
                  </div>
                )}

                {/* **FIX: Properly display location and equipment counts** */}
                <div className="counts-info">
                  <span className="count-item">
                    📍 {customer.location_count || 0} Location
                    {(customer.location_count || 0) !== 1 ? "s" : ""}
                  </span>
                  <span className="count-item">
                    🔧 {customer.equipment_count || 0} Equipment
                  </span>
                </div>

                <div className="meta-info">
                  <div className="created-info">
                    Created by {customer.created_by_name}{" "}
                    {customer.created_by_lastname} on{" "}
                    {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="customer-actions">
                <button
                  onClick={() => handleViewCustomer(customer)}
                  className="action-btn view-btn"
                  title="View Details"
                >
                  View
                </button>
                <button
                  onClick={() => handleEditCustomer(customer)}
                  className="action-btn edit-btn"
                  title="Edit Customer"
                >
                  Edit
                </button>
                {user?.role === "admin" && (
                  <button
                    onClick={() => handleDeleteClick(customer)}
                    className="action-btn delete-btn"
                    title="Delete Customer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* **FIX 3: Add unique key to force re-render when switching between customers** */}
      <CustomerFormModal
        key={editingCustomer ? `edit-${editingCustomer.id}` : "create"}
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingCustomer(null);
        }}
        onSave={handleCustomerSaved}
        customer={editingCustomer}
        mode={formMode}
      />

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCustomer(null);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
            handleEditCustomer(selectedCustomer);
          }}
          onDelete={
            user?.role === "admin"
              ? () => {
                  setShowDetailsModal(false);
                  handleDeleteClick(selectedCustomer);
                }
              : null
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCustomer && (
        <DeleteConfirmationModal
          customer={deletingCustomer}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeletingCustomer(null);
          }}
        />
      )}

      <style jsx>{`
        .customer-list-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
        }

        .header h2 {
          margin: 0;
          color: #333;
        }

        .primary-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .primary-btn:hover {
          background: #0056b3;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close-error {
          background: none;
          border: none;
          color: #721c24;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          width: 20px;
          height: 20px;
        }

        .filters {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          padding: 20px;
        }

        .filters-content {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .search-input,
        .filter-select {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .search-input {
          flex: 1;
          max-width: 300px;
        }

        .filter-select {
          min-width: 150px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .no-customers {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .customers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .customer-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .customer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .customer-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 15px;
        }

        .customer-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
        }

        .customer-type {
          background: #e9ecef;
          color: #495057;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .customer-info {
          margin-bottom: 15px;
        }

        .contact-info {
          margin-bottom: 8px;
          font-size: 14px;
          color: #555;
        }

        .contact-count {
          color: #007bff;
          font-size: 12px;
          font-style: italic;
        }

        .counts-info {
          display: flex;
          gap: 15px;
          margin: 12px 0;
          padding: 8px 0;
          border-top: 1px solid #eee;
        }

        .count-item {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .meta-info {
          font-size: 12px;
          color: #666;
        }

        .created-info {
          margin-bottom: 4px;
        }

        .customer-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .action-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .view-btn {
          background: #17a2b8;
          color: white;
        }

        .view-btn:hover {
          background: #138496;
        }

        .edit-btn {
          background: #28a745;
          color: white;
        }

        .edit-btn:hover {
          background: #218838;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
        }

        .delete-btn:hover {
          background: #c82333;
        }

        @media (max-width: 768px) {
          .customers-grid {
            grid-template-columns: 1fr;
          }

          .filters-content {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ customer, onClose, onEdit, onDelete }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{customer.name}</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="details-content">
          <div className="details-section">
            <h3>Contact Information</h3>

            {/* **Display multiple emails if available** */}
            {customer.emails && customer.emails.length > 0 ? (
              customer.emails.map((email, index) => (
                <div key={index} className="detail-row">
                  <strong>Email {index + 1}:</strong> {email}
                </div>
              ))
            ) : customer.email ? (
              <div className="detail-row">
                <strong>Email:</strong> {customer.email}
              </div>
            ) : (
              <div className="detail-row">
                <strong>Email:</strong> Not provided
              </div>
            )}

            {/* **Display multiple phones if available** */}
            {customer.phones && customer.phones.length > 0 ? (
              customer.phones.map((phone, index) => (
                <div key={index} className="detail-row">
                  <strong>Phone {index + 1}:</strong> {phone}
                </div>
              ))
            ) : customer.phone ? (
              <div className="detail-row">
                <strong>Phone:</strong> {customer.phone}
              </div>
            ) : (
              <div className="detail-row">
                <strong>Phone:</strong> Not provided
              </div>
            )}

            <div className="detail-row">
              <strong>Type:</strong> {customer.customer_type || "Not specified"}
            </div>

            {customer.business_type && (
              <div className="detail-row">
                <strong>Business Type:</strong> {customer.business_type}
              </div>
            )}
          </div>

          {/* **FIX: Display location count in details view** */}
          <div className="details-section">
            <h3>Locations ({customer.location_count || 0})</h3>
            {customer.locations && customer.locations.length > 0 ? (
              customer.locations.map((location, index) => (
                <div key={location.id} className="location-item">
                  <div className="location-header">
                    <strong>Location {index + 1}</strong>
                    {location.is_primary && (
                      <span className="primary-badge">Primary</span>
                    )}
                  </div>
                  <div className="location-details">
                    {location.street_address && (
                      <div>{location.street_address}</div>
                    )}
                    {(location.city ||
                      location.state ||
                      location.postal_code) && (
                      <div>
                        {location.city && location.city}
                        {location.city && location.state && ", "}
                        {location.state && location.state}
                        {location.postal_code && ` ${location.postal_code}`}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-items">No locations added</div>
            )}
          </div>

          <div className="details-section">
            <h3>Equipment ({customer.equipment_count || 0})</h3>
            {customer.equipment && customer.equipment.length > 0 ? (
              customer.equipment.map((equipment, index) => (
                <div key={equipment.id} className="equipment-item">
                  <div>
                    <strong>{equipment.equipment_type}</strong>
                  </div>
                  {equipment.brand && <div>Brand: {equipment.brand}</div>}
                  {equipment.model && <div>Model: {equipment.model}</div>}
                  {equipment.serial_number && (
                    <div>Serial: {equipment.serial_number}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-items">No equipment registered</div>
            )}
          </div>

          <div className="details-section">
            <h3>Metadata</h3>
            <div className="detail-row">
              <strong>Created:</strong>{" "}
              {new Date(customer.created_at).toLocaleString()}
            </div>
            <div className="detail-row">
              <strong>Created by:</strong> {customer.created_by_name}{" "}
              {customer.created_by_lastname}
            </div>
            <div className="detail-row">
              <strong>Last updated:</strong>{" "}
              {new Date(customer.updated_at).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onEdit} className="edit-btn">
            Edit Customer
          </button>
          {onDelete && (
            <button onClick={onDelete} className="delete-btn">
              Delete Customer
            </button>
          )}
          <button onClick={onClose} className="close-btn">
            Close
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
          }

          .modal-header h2 {
            margin: 0;
            color: #333;
          }

          .close-button {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            color: #6c757d;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .close-button:hover {
            background: #e9ecef;
            color: #495057;
            border-color: #adb5bd;
          }

          .details-content {
            padding: 20px;
          }

          .details-section {
            margin-bottom: 25px;
          }

          .details-section h3 {
            margin: 0 0 15px 0;
            color: #495057;
            font-size: 16px;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
          }

          .detail-row {
            margin-bottom: 8px;
            font-size: 14px;
            color: #555;
          }

          .location-item,
          .equipment-item {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            border: 1px solid #e9ecef;
          }

          .location-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .primary-badge {
            background: #007bff;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
          }

          .location-details {
            font-size: 14px;
            color: #666;
          }

          .no-items {
            color: #666;
            font-style: italic;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px;
            border-top: 1px solid #eee;
            background: #f8f9fa;
          }

          .edit-btn {
            padding: 10px 20px;
            background: #28a745;
            color: white;
            border: 1px solid #28a745;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .edit-btn:hover {
            background: #218838;
            border-color: #218838;
          }

          .delete-btn {
            padding: 10px 20px;
            background: #dc3545;
            color: white;
            border: 1px solid #dc3545;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .delete-btn:hover {
            background: #c82333;
            border-color: #c82333;
          }

          .close-btn {
            padding: 10px 20px;
            background: #f8f9fa;
            color: #495057;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .close-btn:hover {
            background: #e9ecef;
            border-color: #adb5bd;
          }
        `}</style>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ customer, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Delete Customer</h2>
          <button onClick={onCancel} className="close-button">
            ×
          </button>
        </div>

        <div className="confirmation-content">
          <p>
            Are you sure you want to delete <strong>{customer.name}</strong>?
          </p>
          <p style={{ color: "#666", fontSize: "14px" }}>
            This will mark the customer as inactive. This action can be reversed
            by an administrator.
          </p>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button onClick={onConfirm} className="confirm-delete-btn">
            Delete Customer
          </button>
        </div>

        <style jsx>{`
          .confirmation-content {
            padding: 20px;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px;
            border-top: 1px solid #eee;
            background: #f8f9fa;
          }

          .cancel-btn {
            padding: 10px 20px;
            background: #f8f9fa;
            color: #495057;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .cancel-btn:hover {
            background: #e9ecef;
            border-color: #adb5bd;
          }

          .confirm-delete-btn {
            padding: 10px 20px;
            background: #dc3545;
            color: white;
            border: 1px solid #dc3545;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .confirm-delete-btn:hover {
            background: #c82333;
            border-color: #c82333;
          }
        `}</style>
      </div>
    </div>
  );
};

export default CustomerList;
