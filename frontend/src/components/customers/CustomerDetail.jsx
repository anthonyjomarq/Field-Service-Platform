import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import "./CustomerDetail.css";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchCustomerData = useCallback(async () => {
    try {
      // Fetch customer details
      const customerResponse = await axios.get(API_ENDPOINTS.customer(id), {
        headers: getAuthHeaders(),
      });
      setCustomer(customerResponse.data);

      // Fetch service history (work orders)
      const historyResponse = await axios.get(
        API_ENDPOINTS.customerHistory(id),
        {
          headers: getAuthHeaders(),
        }
      );
      setServiceHistory(historyResponse.data);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      alert("Failed to load customer details");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const handleDeleteCustomer = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this customer? This action cannot be undone."
      )
    ) {
      try {
        await axios.delete(API_ENDPOINTS.customer(id), {
          headers: getAuthHeaders(),
        });
        alert("Customer deleted successfully");
        navigate("/customers");
      } catch (error) {
        console.error("Error deleting customer:", error);
        alert("Failed to delete customer");
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading customer details...</div>;
  }

  if (!customer) {
    return <div className="error">Customer not found</div>;
  }

  const primaryAddress =
    customer.addresses?.find((a) => a.isPrimary) || customer.addresses?.[0];

  return (
    <div className="customer-detail-container">
      {/* Header */}
      <div className="detail-header">
        <div className="header-content">
          <button
            onClick={() => navigate("/customers")}
            className="back-button"
          >
            ← Back to Customers
          </button>
          <h1>{customer.name}</h1>
          <span className={`status status-${customer.status}`}>
            {customer.status}
          </span>
        </div>
        <div className="header-actions">
          <button
            onClick={() => navigate(`/customers/${id}/edit`)}
            className="btn btn-primary"
          >
            Edit Customer
          </button>
          <button onClick={handleDeleteCustomer} className="btn btn-danger">
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Service History ({serviceHistory.length})
        </button>
        <button
          className={`tab ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          Notes
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="overview-content">
            {/* Contact Information */}
            <div className="info-card">
              <h2>Contact Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Email</label>
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                </div>
                {customer.company && (
                  <div className="info-item">
                    <label>Company</label>
                    <span>{customer.company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Addresses */}
            <div className="info-card">
              <h2>Addresses</h2>
              <div className="addresses-grid">
                {customer.addresses?.map((address, index) => (
                  <div key={index} className="address-card">
                    <div className="address-header">
                      <h3>{address.label}</h3>
                      {address.isPrimary && (
                        <span className="primary-badge">Primary</span>
                      )}
                    </div>
                    <p>{address.street}</p>
                    <p>
                      {address.city}, {address.state} {address.zip}
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(
                        `${address.street}, ${address.city}, ${address.state} ${address.zip}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="map-link"
                    >
                      View on Map →
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {customer.tags && customer.tags.length > 0 && (
              <div className="info-card">
                <h2>Tags</h2>
                <div className="tags-display">
                  {customer.tags.map((tag) => (
                    <span key={tag} className="tag-large">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="info-card">
              <h2>Customer Statistics</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{serviceHistory.length}</div>
                  <div className="stat-label">Total Jobs</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {
                      serviceHistory.filter((job) => job.status === "completed")
                        .length
                    }
                  </div>
                  <div className="stat-label">Completed</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    $
                    {serviceHistory
                      .reduce((sum, job) => sum + (job.total || 0), 0)
                      .toFixed(2)}
                  </div>
                  <div className="stat-label">Total Revenue</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString()
                      : "N/A"}
                  </div>
                  <div className="stat-label">Customer Since</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="history-content">
            {serviceHistory.length === 0 ? (
              <div className="empty-state">
                <p>No service history yet</p>
                <button
                  onClick={() => navigate(`/work-orders/new?customerId=${id}`)}
                  className="btn btn-primary"
                >
                  Create First Work Order
                </button>
              </div>
            ) : (
              <div className="history-list">
                {serviceHistory.map((job) => (
                  <div key={job._id} className="history-item">
                    <div className="history-header">
                      <h3>{job.description}</h3>
                      <span className={`job-status status-${job.status}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="history-details">
                      <span>
                        Date: {new Date(job.date).toLocaleDateString()}
                      </span>
                      <span>
                        Technician: {job.technician?.name || "Unassigned"}
                      </span>
                      <span>Total: ${job.total?.toFixed(2) || "0.00"}</span>
                    </div>
                    {job.notes && <p className="history-notes">{job.notes}</p>}
                    <button
                      onClick={() => navigate(`/work-orders/${job._id}`)}
                      className="view-link"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="notes-content">
            <div className="info-card">
              <h2>Customer Notes</h2>
              {customer.notes ? (
                <div className="notes-display">
                  <p>{customer.notes}</p>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No notes added yet</p>
                  <button
                    onClick={() => navigate(`/customers/${id}/edit`)}
                    className="btn btn-secondary"
                  >
                    Add Notes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
