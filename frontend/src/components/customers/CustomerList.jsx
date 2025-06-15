import React, { useState, useEffect, useMemo } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { customerAPI } from "../../services/api";
import {
  Card,
  Button,
  SearchBar,
  Select,
  Modal,
  Spinner,
  ErrorMessage,
  CustomerCard,
  CustomerForm,
  PlusIcon,
} from "../common";

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
      const fullCustomer = await customerAPI.getCustomer(customer.id);
      console.log("📄 Full customer data:", fullCustomer);
      setEditingCustomer(fullCustomer);
      setFormMode("edit");
      setShowFormModal(true);
    } catch (err) {
      setError("Failed to load customer details: " + err.message);
    }
  };

  const handleSaveCustomer = async (savedCustomer) => {
    setShowFormModal(false);
    setEditingCustomer(null);
    await loadCustomers(); // Reload the list
  };

  const handleDeleteClick = (customer) => {
    setDeletingCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      console.log("🗑️ Deleting customer:", deletingCustomer.id);
      await customerAPI.deleteCustomer(deletingCustomer.id);
      await loadCustomers();
      setShowDeleteModal(false);
      setDeletingCustomer(null);
      console.log("✅ Customer deleted and list reloaded");
    } catch (err) {
      setError("Failed to delete customer: " + err.message);
    }
  };

  const clearError = () => setError("");

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || customer.customerType === filterType;

      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, filterType]);

  if (loading)
    return (
      <div className="loading-container">
        <Spinner size="lg" />
      </div>
    );
  if (error) return <ErrorMessage error={error} onRetry={loadCustomers} />;

  return (
    <div className="customer-list">
      <Card>
        <Card.Header
          actions={
            <Button onClick={handleCreateCustomer} icon={<PlusIcon />}>
              Add Customer
            </Button>
          }
        >
          <h2>Customers ({filteredCustomers.length})</h2>
        </Card.Header>

        <Card.Body>
          <div className="list-controls">
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
            />

            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: "", label: "All Types" },
                { value: "residential", label: "Residential" },
                { value: "commercial", label: "Commercial" },
              ]}
            />
          </div>

          <div className="customer-grid">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onEdit={() => handleEditCustomer(customer)}
                onDelete={() => handleDeleteClick(customer)}
              />
            ))}
          </div>
        </Card.Body>
      </Card>

      <Modal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? "Edit Customer" : "New Customer"}
        size="lg"
      >
        <CustomerForm
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onCancel={() => setShowFormModal(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
      >
        <p>Are you sure you want to delete {deletingCustomer?.name}?</p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            marginTop: "20px",
          }}
        >
          <Button onClick={() => setShowDeleteModal(false)} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="danger">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerList;
