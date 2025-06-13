import React, { useState, useEffect } from "react";
import { customerAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");

  const { user } = useAuth();

  // Load customers when component mounts
  useEffect(() => {
    loadCustomers();
  }, []);

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

  // Search customers
  const handleSearch = () => {
    loadCustomers();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("");
    setTimeout(loadCustomers, 100);
  };

  if (loading) {
    return (
      <div className="container">
        <h2>Loading customers...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "800px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Customer Management</h2>
        <button className="btn" style={{ width: "auto" }}>
          + Add New Customer
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Search and Filter Bar */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "4px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: "8px" }}
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: "8px", minWidth: "150px" }}
          >
            <option value="">All Types</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
          </select>

          <button
            onClick={handleSearch}
            className="btn"
            style={{ width: "auto" }}
          >
            Search
          </button>

          <button
            onClick={clearFilters}
            style={{
              padding: "8px 15px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
          Found {customers.length} customers
        </p>
      </div>

      {/* Customer List */}
      {customers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <h3>No customers found</h3>
          <p>Try adjusting your search criteria or add a new customer.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "15px" }}>
          {customers.map((customer) => (
            <div
              key={customer.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "20px",
                background: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>
                    {customer.name}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "10px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <strong>Email:</strong> {customer.email || "Not provided"}
                    </div>
                    <div>
                      <strong>Phone:</strong> {customer.phone || "Not provided"}
                    </div>
                    <div>
                      <strong>Type:</strong>
                      <span
                        style={{
                          background:
                            customer.customer_type === "commercial"
                              ? "#007bff"
                              : "#28a745",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          marginLeft: "5px",
                        }}
                      >
                        {customer.customer_type}
                      </span>
                    </div>
                    <div>
                      <strong>Business:</strong>{" "}
                      {customer.business_type || "Not specified"}
                    </div>
                  </div>

                  <div style={{ fontSize: "14px", color: "#666" }}>
                    <div>
                      <strong>Locations:</strong> {customer.location_count} •
                      <strong> Equipment:</strong> {customer.equipment_count} •
                      <strong> Created:</strong>{" "}
                      {new Date(customer.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Created by:</strong> {customer.created_by_name}{" "}
                      {customer.created_by_lastname}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginLeft: "20px",
                  }}
                >
                  <button
                    style={{
                      padding: "6px 12px",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    onClick={() => alert(`View details for ${customer.name}`)}
                  >
                    View Details
                  </button>

                  <button
                    style={{
                      padding: "6px 12px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    onClick={() => alert(`Edit ${customer.name}`)}
                  >
                    Edit
                  </button>

                  {user?.role === "admin" && (
                    <button
                      style={{
                        padding: "6px 12px",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                      onClick={() => {
                        if (window.confirm(`Delete ${customer.name}?`)) {
                          alert("Delete functionality coming soon");
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerList;
