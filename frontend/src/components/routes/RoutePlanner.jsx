import React, { useState, useEffect } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { routeAPI } from "../../services/api";

const RoutePlanner = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [origin, setOrigin] = useState(
    "3100 Carr 199, Ste 101, San Juan, PR 00926"
  );
  const [routeName, setRouteName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [error, setError] = useState("");

  const { user } = useAuth();

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await routeAPI.getRouteCustomers({ limit: 50 });
      // Filter customers that have locations
      const customersWithLocations = response.customers.filter(
        (customer) => customer.locations && customer.locations.length > 0
      );
      setCustomers(customersWithLocations);
    } catch (err) {
      setError("Failed to load customers: " + err.message);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomers((prev) => {
      const isSelected = prev.find((c) => c.id === customer.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  const optimizeRoute = async () => {
    if (selectedCustomers.length === 0) {
      setError("Please select at least one customer");
      return;
    }

    if (!routeName.trim()) {
      setError("Please enter a route name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const routeData = {
        origin,
        customerIds: selectedCustomers.map((c) => c.id),
        routeName: routeName.trim(),
        scheduledDate: new Date(scheduledDate).toISOString(),
      };

      const response = await routeAPI.optimizeRoute(routeData);
      setOptimizedRoute(response.route);
    } catch (err) {
      setError("Route optimization failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setSelectedCustomers([]);
    setOptimizedRoute(null);
    setRouteName("");
    setError("");
  };

  return (
    <div className="container" style={{ maxWidth: "1000px" }}>
      <h2>Route Planning</h2>

      {error && <div className="error">{error}</div>}

      {/* Route Configuration */}
      <div
        style={{
          background: "#f8f9fa",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h3>Route Configuration</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            marginBottom: "15px",
          }}
        >
          <div className="form-group">
            <label>Route Name:</label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g., Morning Route - San Juan"
              required
            />
          </div>

          <div className="form-group">
            <label>Scheduled Date:</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Starting Point (Origin):</label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Enter starting address"
            required
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={optimizeRoute}
            className="btn"
            disabled={loading || selectedCustomers.length === 0}
            style={{ width: "auto" }}
          >
            {loading
              ? "Optimizing..."
              : `Optimize Route (${selectedCustomers.length} stops)`}
          </button>

          <button
            onClick={clearRoute}
            style={{
              padding: "10px 20px",
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
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* Customer Selection */}
        <div>
          <h3>Select Customers ({selectedCustomers.length} selected)</h3>

          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            {customers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleCustomerSelect(customer)}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  background: selectedCustomers.find(
                    (c) => c.id === customer.id
                  )
                    ? "#e3f2fd"
                    : "white",
                  transition: "background-color 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold" }}>{customer.name}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {customer.business_type} • {customer.phone}
                    </div>
                    {customer.locations[0] && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#888",
                          marginTop: "4px",
                        }}
                      >
                        📍 {customer.locations[0].address}
                      </div>
                    )}
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      !!selectedCustomers.find((c) => c.id === customer.id)
                    }
                    onChange={() => {}} // Handled by div onClick
                    style={{ pointerEvents: "none" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Route Results */}
        <div>
          <h3>Route Results</h3>

          {optimizedRoute ? (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "15px",
              }}
            >
              <div className="success" style={{ marginBottom: "15px" }}>
                Route optimized successfully!
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Route:</strong> {optimizedRoute.routeName}
                <br />
                <strong>Date:</strong>{" "}
                {new Date(optimizedRoute.scheduledDate).toLocaleDateString()}
                <br />
                <strong>Customers:</strong>{" "}
                {optimizedRoute.stats.totalCustomers}
                <br />
                <strong>Total Distance:</strong>{" "}
                {(optimizedRoute.stats.totalDistance / 1000).toFixed(1)} km
                <br />
                <strong>Estimated Time:</strong>{" "}
                {Math.round(optimizedRoute.stats.totalDuration / 60)} minutes
              </div>

              <div>
                <h4>Stop Order:</h4>
                <ol style={{ paddingLeft: "20px" }}>
                  <li style={{ marginBottom: "5px" }}>
                    <strong>Start:</strong> {optimizedRoute.origin}
                  </li>
                  {optimizedRoute.customerLocations.map((location, index) => (
                    <li key={index} style={{ marginBottom: "5px" }}>
                      <strong>{location.customerName}</strong>
                      <br />
                      <span style={{ fontSize: "14px", color: "#666" }}>
                        {location.address}
                      </span>
                      {location.accessNotes && (
                        <div style={{ fontSize: "12px", color: "#888" }}>
                          📝 {location.accessNotes}
                        </div>
                      )}
                    </li>
                  ))}
                  <li style={{ marginBottom: "5px" }}>
                    <strong>Return:</strong> {optimizedRoute.origin}
                  </li>
                </ol>
              </div>

              <button
                style={{
                  marginTop: "15px",
                  padding: "8px 16px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() => alert("Save route functionality coming soon!")}
              >
                Save Route
              </button>
            </div>
          ) : (
            <div
              style={{
                border: "2px dashed #ddd",
                borderRadius: "4px",
                padding: "40px",
                textAlign: "center",
                color: "#666",
              }}
            >
              <p>Select customers and click "Optimize Route" to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
