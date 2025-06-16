import axios from "axios";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

import "./CustomerList.css";
const CustomerList = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.customers, {
        headers: getAuthHeaders(),
      });
      setCustomers(response.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      alert("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // Get all unique tags from customers
  const allTags = useMemo(() => {
    const tags = new Set();
    customers.forEach((customer) => {
      customer.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [customers]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm) ||
          (customer.company &&
            customer.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (customer) => customer.status === statusFilter
      );
    }

    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter((customer) =>
        customer.tags?.includes(tagFilter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      // Convert to lowercase for string comparison
      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    customers,
    searchTerm,
    statusFilter,
    tagFilter,
    sortField,
    sortDirection,
  ]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(filteredCustomers.map((c) => c._id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedCustomers.length} customer(s)?`
      )
    ) {
      try {
        await Promise.all(
          selectedCustomers.map((id) => axios.delete(`/api/customers/${id}`))
        );
        alert("Customers deleted successfully");
        fetchCustomers();
        setSelectedCustomers([]);
      } catch (error) {
        console.error("Error deleting customers:", error);
        alert("Failed to delete some customers");
      }
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await axios.delete(`/api/customers/${id}`);
        alert("Customer deleted successfully");
        fetchCustomers();
      } catch (error) {
        console.error("Error deleting customer:", error);
        alert("Failed to delete customer");
      }
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Status",
      "Tags",
      "Primary Address",
    ];
    const csvData = filteredCustomers.map((customer) => {
      const primaryAddress =
        customer.addresses?.find((a) => a.isPrimary) || customer.addresses?.[0];
      return [
        customer.name,
        customer.email,
        customer.phone,
        customer.company || "",
        customer.status,
        (customer.tags || []).join("; "),
        primaryAddress
          ? `${primaryAddress.street}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zip}`
          : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="loading">Loading customers...</div>;
  }

  return (
    <div className="customer-list-container">
      <div className="list-header">
        <h1>Customers</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/customers/new")}
        >
          Add New Customer
        </button>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, email, phone, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <button onClick={exportToCSV} className="btn btn-export">
            Export CSV
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedCustomers.length} customer(s) selected</span>
          <button onClick={handleBulkDelete} className="btn btn-danger">
            Delete Selected
          </button>
        </div>
      )}

      {/* Customer Table */}
      <div className="table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedCustomers.length === filteredCustomers.length &&
                    filteredCustomers.length > 0
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th onClick={() => handleSort("name")} className="sortable">
                Name{" "}
                {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("email")} className="sortable">
                Email{" "}
                {sortField === "email" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>Phone</th>
              <th onClick={() => handleSort("company")} className="sortable">
                Company{" "}
                {sortField === "company" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>Status</th>
              <th>Tags</th>
              <th>Primary Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  {searchTerm || statusFilter !== "all" || tagFilter
                    ? "No customers found matching your filters"
                    : 'No customers yet. Click "Add New Customer" to get started.'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const primaryAddress =
                  customer.addresses?.find((a) => a.isPrimary) ||
                  customer.addresses?.[0];
                return (
                  <tr key={customer._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer._id)}
                        onChange={() => handleSelectCustomer(customer._id)}
                      />
                    </td>
                    <td className="name-cell">
                      <button
                        className="link-button"
                        onClick={() => navigate(`/customers/${customer._id}`)}
                      >
                        {customer.name}
                      </button>
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.company || "-"}</td>
                    <td>
                      <span className={`status status-${customer.status}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td>
                      <div className="tags-cell">
                        {customer.tags?.map((tag) => (
                          <span key={tag} className="tag-badge">
                            {tag}
                          </span>
                        )) || "-"}
                      </div>
                    </td>
                    <td className="address-cell">
                      {primaryAddress ? (
                        <span
                          title={`${primaryAddress.street}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zip}`}
                        >
                          {primaryAddress.city}, {primaryAddress.state}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() =>
                          navigate(`/customers/${customer._id}/edit`)
                        }
                        className="btn-action btn-edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer._id)}
                        className="btn-action btn-delete"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="list-summary">
        Showing {filteredCustomers.length} of {customers.length} customers
      </div>
    </div>
  );
};

export default CustomerList;
