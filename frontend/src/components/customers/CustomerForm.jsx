import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import "./CustomerForm.css";

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    addresses: [
      {
        street: "",
        city: "",
        state: "",
        zip: "",
        isPrimary: true,
        label: "Primary",
      },
    ],
    notes: "",
    tags: [],
    status: "active",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.customer(id), {
        headers: getAuthHeaders(),
      });
      setFormData(response.data);
    } catch (error) {
      console.error("Error fetching customer:", error);
      alert("Failed to load customer data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      fetchCustomer();
    }
  }, [isEditMode, fetchCustomer]);

  const validateForm = () => {
    const newErrors = {};

    // Required field validation
    if (!formData.name.trim()) {
      newErrors.name = "Customer name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Validate at least one address
    const hasValidAddress = formData.addresses.some(
      (addr) =>
        addr.street.trim() &&
        addr.city.trim() &&
        addr.state.trim() &&
        addr.zip.trim()
    );

    if (!hasValidAddress) {
      newErrors.addresses = "At least one complete address is required";
    }

    // Validate each address
    formData.addresses.forEach((address, index) => {
      if (address.street || address.city || address.state || address.zip) {
        // If any field is filled, all are required
        if (!address.street.trim()) {
          newErrors[`address_${index}_street`] = "Street is required";
        }
        if (!address.city.trim()) {
          newErrors[`address_${index}_city`] = "City is required";
        }
        if (!address.state.trim()) {
          newErrors[`address_${index}_state`] = "State is required";
        }
        if (!address.zip.trim()) {
          newErrors[`address_${index}_zip`] = "ZIP code is required";
        } else if (!/^\d{5}(-\d{4})?$/.test(address.zip)) {
          newErrors[`address_${index}_zip`] = "Invalid ZIP code format";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleAddressChange = (index, field, value) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value,
    };
    setFormData((prev) => ({
      ...prev,
      addresses: newAddresses,
    }));
    // Clear specific address error
    const errorKey = `address_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: "" }));
    }
  };

  const addAddress = () => {
    setFormData((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        {
          street: "",
          city: "",
          state: "",
          zip: "",
          isPrimary: false,
          label: `Address ${prev.addresses.length + 1}`,
        },
      ],
    }));
  };

  const removeAddress = (index) => {
    if (formData.addresses.length > 1) {
      const newAddresses = formData.addresses.filter((_, i) => i !== index);
      // Ensure at least one address is primary
      if (formData.addresses[index].isPrimary && newAddresses.length > 0) {
        newAddresses[0].isPrimary = true;
      }
      setFormData((prev) => ({
        ...prev,
        addresses: newAddresses,
      }));
    }
  };

  const setPrimaryAddress = (index) => {
    const newAddresses = formData.addresses.map((addr, i) => ({
      ...addr,
      isPrimary: i === index,
    }));
    setFormData((prev) => ({
      ...prev,
      addresses: newAddresses,
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await axios.put(API_ENDPOINTS.customer(id), formData, {
          headers: getAuthHeaders(),
        });
      } else {
        await axios.post(API_ENDPOINTS.customers, formData, {
          headers: getAuthHeaders(),
        });
      }

      alert(`Customer ${isEditMode ? "updated" : "created"} successfully!`);
      navigate("/customers");
    } catch (error) {
      console.error("Error saving customer:", error);
      alert(`Failed to ${isEditMode ? "update" : "create"} customer`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div className="loading">Loading customer data...</div>;
  }

  return (
    <div className="customer-form-container">
      <h2>{isEditMode ? "Edit Customer" : "New Customer"}</h2>

      <form onSubmit={handleSubmit} className="customer-form">
        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "error" : ""}
            />
            {errors.name && (
              <span className="error-message">{errors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? "error" : ""}
            />
            {errors.phone && (
              <span className="error-message">{errors.phone}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="company">Company</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Addresses */}
        <div className="form-section">
          <h3>Addresses</h3>
          {errors.addresses && (
            <span className="error-message">{errors.addresses}</span>
          )}

          {formData.addresses.map((address, index) => (
            <div key={index} className="address-section">
              <div className="address-header">
                <input
                  type="text"
                  value={address.label}
                  onChange={(e) =>
                    handleAddressChange(index, "label", e.target.value)
                  }
                  className="address-label"
                />
                <div className="address-actions">
                  <label>
                    <input
                      type="radio"
                      checked={address.isPrimary}
                      onChange={() => setPrimaryAddress(index)}
                    />
                    Primary
                  </label>
                  {formData.addresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAddress(index)}
                      className="btn-remove"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="address-fields">
                <div className="form-group">
                  <label>Street</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) =>
                      handleAddressChange(index, "street", e.target.value)
                    }
                    className={errors[`address_${index}_street`] ? "error" : ""}
                  />
                  {errors[`address_${index}_street`] && (
                    <span className="error-message">
                      {errors[`address_${index}_street`]}
                    </span>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) =>
                        handleAddressChange(index, "city", e.target.value)
                      }
                      className={errors[`address_${index}_city`] ? "error" : ""}
                    />
                    {errors[`address_${index}_city`] && (
                      <span className="error-message">
                        {errors[`address_${index}_city`]}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={address.state}
                      onChange={(e) =>
                        handleAddressChange(index, "state", e.target.value)
                      }
                      className={
                        errors[`address_${index}_state`] ? "error" : ""
                      }
                    />
                    {errors[`address_${index}_state`] && (
                      <span className="error-message">
                        {errors[`address_${index}_state`]}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      value={address.zip}
                      onChange={(e) =>
                        handleAddressChange(index, "zip", e.target.value)
                      }
                      className={errors[`address_${index}_zip`] ? "error" : ""}
                    />
                    {errors[`address_${index}_zip`] && (
                      <span className="error-message">
                        {errors[`address_${index}_zip`]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addAddress} className="btn-add">
            Add Address
          </button>
        </div>

        {/* Tags */}
        <div className="form-section">
          <h3>Tags</h3>
          <div className="tags-container">
            <div className="tag-input-group">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                placeholder="Add a tag"
              />
              <button type="button" onClick={addTag} className="btn-add-tag">
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="form-section">
          <h3>Notes</h3>
          <div className="form-group">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Add any additional notes about this customer..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate("/customers")}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditMode
                ? "Update Customer"
                : "Create Customer"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
