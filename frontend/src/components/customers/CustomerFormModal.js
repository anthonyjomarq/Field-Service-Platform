import React, { useState, useEffect } from "react";
import { customerAPI } from "../../services/api";

const CustomerFormModal = ({
  isOpen,
  onClose,
  onSave,
  customer = null, // null for create, customer object for edit
  mode = "create", // "create" or "edit"
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    customerType: "commercial",
    businessType: "",
    primaryLocation: {
      streetAddress: "",
      city: "",
      state: "PR",
      postalCode: "",
    },
    additionalLocations: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer && mode === "edit") {
      const primaryLoc = customer.locations?.[0] || {};
      const additionalLocs = customer.locations?.slice(1) || [];

      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        customerType: customer.customer_type || "commercial",
        businessType: customer.business_type || "",
        primaryLocation: {
          streetAddress: primaryLoc.street_address || primaryLoc.address || "",
          city: primaryLoc.city || "",
          state: primaryLoc.state || "PR",
          postalCode: primaryLoc.postal_code || primaryLoc.zip_code || "",
        },
        additionalLocations: additionalLocs.map((loc) => ({
          streetAddress: loc.street_address || loc.address || "",
          city: loc.city || "",
          state: loc.state || "PR",
          postalCode: loc.postal_code || loc.zip_code || "",
        })),
      });
    } else {
      // Reset for create mode
      setFormData({
        name: "",
        email: "",
        phone: "",
        customerType: "commercial",
        businessType: "",
        primaryLocation: {
          streetAddress: "",
          city: "",
          state: "PR",
          postalCode: "",
        },
        additionalLocations: [],
      });
    }
  }, [customer, mode, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Basic validation
      if (!formData.name.trim()) {
        throw new Error("Customer name is required");
      }

      if (
        formData.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
      ) {
        throw new Error("Please provide a valid email address");
      }

      // Prepare locations data
      const locations = [];

      // Add primary location if provided
      if (
        formData.primaryLocation.streetAddress ||
        formData.primaryLocation.city
      ) {
        locations.push({
          ...formData.primaryLocation,
          addressType: "primary",
          isPrimary: true,
        });
      }

      // Add additional locations
      formData.additionalLocations.forEach((location, index) => {
        if (location.streetAddress || location.city) {
          locations.push({
            ...location,
            addressType: "service",
            isPrimary: false,
          });
        }
      });

      const customerData = {
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        customerType: formData.customerType,
        businessType: formData.businessType?.trim() || null,
        locations,
      };

      let result;
      if (mode === "edit" && customer) {
        result = await customerAPI.updateCustomer(customer.id, customerData);
      } else {
        result = await customerAPI.createCustomer(customerData);
      }

      onSave(result.customer);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const addAdditionalLocation = () => {
    setFormData((prev) => ({
      ...prev,
      additionalLocations: [
        ...prev.additionalLocations,
        {
          streetAddress: "",
          city: "",
          state: "PR",
          postalCode: "",
        },
      ],
    }));
  };

  const removeAdditionalLocation = (index) => {
    setFormData((prev) => ({
      ...prev,
      additionalLocations: prev.additionalLocations.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateAdditionalLocation = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      additionalLocations: prev.additionalLocations.map((loc, i) =>
        i === index ? { ...loc, [field]: value } : loc
      ),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{mode === "edit" ? "Edit Customer" : "Add New Customer"}</h2>
          <button onClick={onClose} className="close-button" disabled={loading}>
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Company Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={loading}
              placeholder="Enter company name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              placeholder="contact@company.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={loading}
              placeholder="787-555-0123"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="customerType">Customer Type</label>
              <select
                id="customerType"
                name="customerType"
                value={formData.customerType}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="businessType">Business Type</label>
              <input
                type="text"
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="restaurant, retail, hotel..."
              />
            </div>
          </div>

          {/* Primary Location Section */}
          <div className="locations-section">
            <h3>Primary Service Location</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="streetAddress">Street Address</label>
                <input
                  type="text"
                  id="streetAddress"
                  name="streetAddress"
                  value={formData.primaryLocation?.streetAddress || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryLocation: {
                        ...prev.primaryLocation,
                        streetAddress: e.target.value,
                      },
                    }))
                  }
                  disabled={loading}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.primaryLocation?.city || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryLocation: {
                        ...prev.primaryLocation,
                        city: e.target.value,
                      },
                    }))
                  }
                  disabled={loading}
                  placeholder="San Juan"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.primaryLocation?.state || "PR"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryLocation: {
                        ...prev.primaryLocation,
                        state: e.target.value,
                      },
                    }))
                  }
                  disabled={loading}
                  placeholder="PR"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.primaryLocation?.postalCode || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryLocation: {
                        ...prev.primaryLocation,
                        postalCode: e.target.value,
                      },
                    }))
                  }
                  disabled={loading}
                  placeholder="00901"
                />
              </div>
            </div>

            {/* Additional Locations */}
            {formData.additionalLocations &&
              formData.additionalLocations.length > 0 && (
                <div className="additional-locations">
                  <h4>Additional Locations</h4>
                  {formData.additionalLocations.map((location, index) => (
                    <div key={index} className="additional-location">
                      <div className="location-header">
                        <span>Location #{index + 2}</span>
                        <button
                          type="button"
                          onClick={() => removeAdditionalLocation(index)}
                          className="remove-location-btn"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="form-row">
                        <input
                          type="text"
                          value={location.streetAddress || ""}
                          onChange={(e) =>
                            updateAdditionalLocation(
                              index,
                              "streetAddress",
                              e.target.value
                            )
                          }
                          placeholder="Street Address"
                          disabled={loading}
                        />
                        <input
                          type="text"
                          value={location.city || ""}
                          onChange={(e) =>
                            updateAdditionalLocation(
                              index,
                              "city",
                              e.target.value
                            )
                          }
                          placeholder="City"
                          disabled={loading}
                        />
                      </div>

                      <div className="form-row">
                        <input
                          type="text"
                          value={location.state || "PR"}
                          onChange={(e) =>
                            updateAdditionalLocation(
                              index,
                              "state",
                              e.target.value
                            )
                          }
                          placeholder="State"
                          disabled={loading}
                        />
                        <input
                          type="text"
                          value={location.postalCode || ""}
                          onChange={(e) =>
                            updateAdditionalLocation(
                              index,
                              "postalCode",
                              e.target.value
                            )
                          }
                          placeholder="Postal Code"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            <button
              type="button"
              onClick={addAdditionalLocation}
              className="add-location-btn"
              disabled={loading}
            >
              + Add Another Location
            </button>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading
                ? "Saving..."
                : mode === "edit"
                ? "Update Customer"
                : "Create Customer"}
            </button>
          </div>
        </form>
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

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          margin: 20px;
          border-radius: 4px;
          border: 1px solid #f5c6cb;
        }

        form {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .locations-section {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .locations-section h3,
        .locations-section h4 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .additional-locations {
          margin-top: 20px;
        }

        .additional-location {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .location-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          font-weight: 500;
          color: #495057;
        }

        .remove-location-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .remove-location-btn:hover {
          background: #c82333;
        }

        .add-location-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-top: 15px;
          transition: background 0.2s;
        }

        .add-location-btn:hover {
          background: #218838;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .cancel-btn {
          padding: 12px 24px;
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

        .submit-btn {
          padding: 12px 24px;
          background: #007bff;
          color: white;
          border: 1px solid #007bff;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .submit-btn:hover {
          background: #0056b3;
          border-color: #0056b3;
        }

        .submit-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn:disabled:hover,
        .cancel-btn:disabled:hover {
          background: #007bff;
          border-color: #007bff;
        }

        .cancel-btn:disabled:hover {
          background: #f8f9fa;
          border-color: #dee2e6;
        }
      `}</style>
    </div>
  );
};

export default CustomerFormModal;
