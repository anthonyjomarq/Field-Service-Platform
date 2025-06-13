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
    emails: [""], // Changed to array for multiple emails
    phones: [""], // Changed to array for multiple phones
    customerType: "commercial",
    businessType: "",
    // **SIMPLIFIED: Only one location instead of primary + additional**
    location: {
      streetAddress: "",
      city: "",
      state: "PR",
      postalCode: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize form data when customer changes
  useEffect(() => {
    console.log("🔍 CustomerFormModal: Initializing form data", {
      customer,
      mode,
      isOpen,
    });

    if (customer && mode === "edit") {
      // Get the first location for editing
      const firstLocation = customer.locations?.[0] || {};

      const initEmails =
        customer.emails && customer.emails.length > 0
          ? customer.emails
          : customer.email
          ? [customer.email]
          : [""];

      const initPhones =
        customer.phones && customer.phones.length > 0
          ? customer.phones
          : customer.phone
          ? [customer.phone]
          : [""];

      console.log("📧 Email data:", {
        customerEmails: customer.emails,
        customerEmail: customer.email,
        initEmails,
      });
      console.log("📱 Phone data:", {
        customerPhones: customer.phones,
        customerPhone: customer.phone,
        initPhones,
      });

      setFormData({
        name: customer.name || "",
        emails: initEmails,
        phones: initPhones,
        customerType: customer.customer_type || "commercial",
        businessType: customer.business_type || "",
        // **SIMPLIFIED: Single location**
        location: {
          streetAddress:
            firstLocation.street_address || firstLocation.address || "",
          city: firstLocation.city || "",
          state: firstLocation.state || "PR",
          postalCode: firstLocation.postal_code || firstLocation.zip_code || "",
        },
      });
    } else {
      // Reset for create mode
      console.log("🆕 Creating new customer - resetting form");
      setFormData({
        name: "",
        emails: [""],
        phones: [""],
        customerType: "commercial",
        businessType: "",
        location: {
          streetAddress: "",
          city: "",
          state: "PR",
          postalCode: "",
        },
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

  // Handle location changes
  const handleLocationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  // Handle email changes
  const handleEmailChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.map((email, i) => (i === index ? value : email)),
    }));
  };

  const addEmail = () => {
    setFormData((prev) => ({
      ...prev,
      emails: [...prev.emails, ""],
    }));
  };

  const removeEmail = (index) => {
    if (formData.emails.length > 1) {
      setFormData((prev) => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index),
      }));
    }
  };

  // Handle phone changes
  const handlePhoneChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      phones: prev.phones.map((phone, i) => (i === index ? value : phone)),
    }));
  };

  const addPhone = () => {
    setFormData((prev) => ({
      ...prev,
      phones: [...prev.phones, ""],
    }));
  };

  const removePhone = (index) => {
    if (formData.phones.length > 1) {
      setFormData((prev) => ({
        ...prev,
        phones: prev.phones.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.name.trim()) {
        throw new Error("Customer name is required");
      }

      // Validate emails
      const validEmails = formData.emails.filter((email) => email.trim());
      for (const email of validEmails) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error(`Please provide a valid email address: ${email}`);
        }
      }

      // **SIMPLIFIED: Prepare single location if provided**
      const locations = [];
      if (formData.location.streetAddress || formData.location.city) {
        locations.push({
          ...formData.location,
          addressType: "primary",
          isPrimary: true,
        });
      }

      const customerData = {
        name: formData.name.trim(),
        email: validEmails[0] || null,
        phone: formData.phones.filter((phone) => phone.trim())[0] || null,
        emails: validEmails,
        phones: formData.phones.filter((phone) => phone.trim()),
        customerType: formData.customerType,
        businessType: formData.businessType?.trim() || null,
        locations,
      };

      console.log("💾 Saving customer data:", customerData);

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

          {/* Multiple Emails Section */}
          <div className="contact-section">
            <h4>Email Addresses</h4>
            {formData.emails.map((email, index) => (
              <div key={index} className="contact-item">
                <div className="contact-header">
                  <span>Email {index + 1}</span>
                  {formData.emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="remove-contact-btn"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    disabled={loading}
                    placeholder="contact@company.com"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addEmail}
              className="add-contact-btn"
              disabled={loading}
            >
              + Add Another Email
            </button>
          </div>

          {/* Multiple Phones Section */}
          <div className="contact-section">
            <h4>Phone Numbers</h4>
            {formData.phones.map((phone, index) => (
              <div key={index} className="contact-item">
                <div className="contact-header">
                  <span>Phone {index + 1}</span>
                  {formData.phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="remove-contact-btn"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(index, e.target.value)}
                    disabled={loading}
                    placeholder="787-555-0000"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addPhone}
              className="add-contact-btn"
              disabled={loading}
            >
              + Add Another Phone
            </button>
          </div>

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
              placeholder="e.g., Restaurant, Retail, Hotel"
            />
          </div>

          {/* **SIMPLIFIED: Single Location Section** */}
          <div className="location-section">
            <h4>Location</h4>
            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                value={formData.location.streetAddress}
                onChange={(e) =>
                  handleLocationChange("streetAddress", e.target.value)
                }
                disabled={loading}
                placeholder="123 Main Street"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.location.city}
                  onChange={(e) => handleLocationChange("city", e.target.value)}
                  disabled={loading}
                  placeholder="San Juan"
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <select
                  value={formData.location.state}
                  onChange={(e) =>
                    handleLocationChange("state", e.target.value)
                  }
                  disabled={loading}
                >
                  <option value="PR">Puerto Rico</option>
                  <option value="FL">Florida</option>
                  <option value="NY">New York</option>
                </select>
              </div>

              <div className="form-group">
                <label>Postal Code</label>
                <input
                  type="text"
                  value={formData.location.postalCode}
                  onChange={(e) =>
                    handleLocationChange("postalCode", e.target.value)
                  }
                  disabled={loading}
                  placeholder="00926"
                />
              </div>
            </div>
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
          margin-bottom: 15px;
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
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
        }

        .contact-section,
        .location-section {
          margin-bottom: 25px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .contact-section h4,
        .location-section h4 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 16px;
        }

        .contact-item {
          margin-bottom: 15px;
          padding: 12px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
        }

        .contact-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .contact-header span {
          font-weight: 500;
          color: #495057;
        }

        .remove-contact-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .remove-contact-btn:hover {
          background: #c82333;
        }

        .add-contact-btn {
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

        .add-contact-btn:hover {
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

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
            margin: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerFormModal;
