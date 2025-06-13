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

      const response = await customerAPI.getCustomers(filters);
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
      // Get full customer details including locations
      const fullCustomer = await customerAPI.getCustomer(customer.id);
      setEditingCustomer(fullCustomer);
      setFormMode("edit");
      setShowFormModal(true);
    } catch (err) {
      setError("Failed to load customer details: " + err.message);
    }
  };

  const handleCustomerSaved = (savedCustomer) => {
    if (formMode === "create") {
      setCustomers((prev) => [savedCustomer, ...prev]);
    } else {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === savedCustomer.id ? { ...c, ...savedCustomer } : c
        )
      );
    }
    setShowFormModal(false);
    setEditingCustomer(null);
  };

  const handleViewDetails = async (customer) => {
    try {
      const fullCustomer = await customerAPI.getCustomer(customer.id);
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
      await customerAPI.deleteCustomer(deletingCustomer.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      setShowDeleteModal(false);
      setDeletingCustomer(null);
    } catch (err) {
      setError("Failed to delete customer: " + err.message);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("");
  };

  if (loading && customers.length === 0) {
    return (
      <div className="container">
        <h2>Loading customers...</h2>
      </div>
    );
  }

  return (
    <div className="customer-list-container">
      <div className="header">
        <div className="header-content">
          <h2>Customer Management</h2>
          <button className="primary-btn" onClick={handleCreateCustomer}>
            + Add New Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")} className="close-error">
            ×
          </button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="filters-section">
        <div className="filters-content">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
          </select>

          {(searchTerm || filterType) && (
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          )}
        </div>

        <div className="results-info">Found {customers.length} customers</div>
      </div>

      {/* Customer Grid */}
      {customers.length === 0 ? (
        <div className="empty-state">
          <h3>No customers found</h3>
          <p>
            {searchTerm || filterType
              ? "Try adjusting your search criteria or "
              : "Get started by adding your first customer."}
          </p>
          <button onClick={handleCreateCustomer} className="primary-btn">
            Add New Customer
          </button>
        </div>
      ) : (
        <div className="customers-grid">
          {customers.map((customer) => (
            <div key={customer.id} className="customer-card">
              <div className="customer-header">
                <h3 className="customer-name">{customer.name}</h3>
                <span className={`customer-type ${customer.customer_type}`}>
                  {customer.customer_type}
                </span>
              </div>

              <div className="customer-info">
                <div className="info-row">
                  <strong>Email:</strong>
                  <span>{customer.email || "Not provided"}</span>
                </div>
                <div className="info-row">
                  <strong>Phone:</strong>
                  <span>{customer.phone || "Not provided"}</span>
                </div>
                <div className="info-row">
                  <strong>Business:</strong>
                  <span>{customer.business_type || "Not specified"}</span>
                </div>
              </div>

              <div className="customer-stats">
                <div className="stat">
                  <span className="stat-number">{customer.location_count}</span>
                  <span className="stat-label">Locations</span>
                </div>
                <div className="stat">
                  <span className="stat-number">
                    {customer.equipment_count}
                  </span>
                  <span className="stat-label">Equipment</span>
                </div>
              </div>

              <div className="customer-meta">
                <div className="created-info">
                  Created by {customer.created_by_name}{" "}
                  {customer.created_by_lastname}
                </div>
                <div className="created-date">
                  {new Date(customer.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="customer-actions">
                <button
                  onClick={() => handleViewDetails(customer)}
                  className="action-btn view-btn"
                  title="View Details"
                >
                  View Details
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

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingCustomer(null);
        }}
        onSave={handleCustomerSaved}
        customer={editingCustomer}
        mode={formMode}
      />

      {/* Customer Details Modal - UPDATED FOR MULTIPLE CONTACTS */}
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

        .filters-section {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 20px;
        }

        .filters-content {
          display: flex;
          gap: 15px;
          align-items: center;
          margin-bottom: 10px;
        }

        .search-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .filter-select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-width: 150px;
        }

        .clear-filters-btn {
          padding: 10px 15px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .clear-filters-btn:hover {
          background: #5a6268;
        }

        .results-info {
          color: #666;
          font-size: 14px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .empty-state h3 {
          color: #333;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 20px;
        }

        .customers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .customer-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .customer-name {
          margin: 0;
          color: #333;
          font-size: 18px;
          flex: 1;
        }

        .customer-type {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .customer-type.commercial {
          background: #e3f2fd;
          color: #1976d2;
        }

        .customer-type.residential {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .customer-info {
          margin-bottom: 15px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .info-row strong {
          color: #333;
        }

        .info-row span {
          color: #666;
          text-align: right;
        }

        .customer-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .stat {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }

        .customer-meta {
          margin-bottom: 15px;
          padding-top: 10px;
          border-top: 1px solid #eee;
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

// Customer Details Modal Component - UPDATED TO SHOW MULTIPLE EMAILS AND PHONES
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

            {/* Display multiple emails if available */}
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

            {/* Display multiple phones if available */}
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
              <strong>Type:</strong> {customer.customer_type}
            </div>
            <div className="detail-row">
              <strong>Business:</strong>{" "}
              {customer.business_type || "Not specified"}
            </div>
          </div>

          {customer.locations && customer.locations.length > 0 && (
            <div className="details-section">
              <h3>Locations ({customer.locations.length})</h3>
              {customer.locations.map((location, index) => (
                <div key={index} className="location-detail">
                  <div className="location-header">
                    <strong>
                      {location.street_address || location.address}
                    </strong>
                    <span className="location-type">
                      ({location.address_type})
                    </span>
                  </div>
                  <div>
                    {location.city}, {location.state}{" "}
                    {location.postal_code || location.zip_code}
                  </div>
                  {location.contact_person && (
                    <div className="location-contact">
                      Contact: {location.contact_person}
                    </div>
                  )}
                  {location.service_hours && (
                    <div className="location-hours">
                      Hours: {location.service_hours}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {customer.equipment && customer.equipment.length > 0 && (
            <div className="details-section">
              <h3>Equipment ({customer.equipment.length})</h3>
              {customer.equipment.map((item, index) => (
                <div key={index} className="equipment-detail">
                  <strong>{item.equipment_type}</strong> - {item.brand}{" "}
                  {item.model}
                  {item.serial_number && (
                    <div>Serial: {item.serial_number}</div>
                  )}
                  <div className="equipment-status">Status: {item.status}</div>
                </div>
              ))}
            </div>
          )}
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
          <button onClick={onClose} className="cancel-btn">
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
            max-height: 60vh;
            overflow-y: auto;
          }

          .details-section {
            margin-bottom: 25px;
          }

          .details-section h3 {
            margin: 0 0 15px 0;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 8px 0;
          }

          .detail-row strong {
            color: #333;
          }

          .location-detail,
          .equipment-detail {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 10px;
          }

          .location-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .location-type {
            background: #007bff;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            text-transform: capitalize;
          }

          .location-contact,
          .location-hours {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }

          .equipment-detail {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 10px;
          }

          .equipment-status {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px;
            border-top: 1px solid #eee;
            background: #f8f9fa;
          }

          .modal-actions button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
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
          <h2>Confirm Deletion</h2>
        </div>

        <div className="modal-body">
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
