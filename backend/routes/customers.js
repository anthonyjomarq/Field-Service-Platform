import express from "express";
import databaseService from "../services/databaseService.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET /api/customers - List all customers
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, customerType, limit } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (customerType) filters.customerType = customerType;
    if (limit) filters.limit = parseInt(limit);

    const customers = await databaseService.getCustomers(
      req.user.companyId || "550e8400-e29b-41d4-a716-446655440000",
      filters
    );

    res.json({
      customers,
      total: customers.length,
      filters: filters,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      error: "Failed to fetch customers",
      details: error.message,
    });
  }
});

// GET /api/customers/:id - Get specific customer details
router.get("/:id", authenticate, async (req, res) => {
  try {
    const customer = await databaseService.getCustomerById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      error: "Failed to fetch customer details",
      details: error.message,
    });
  }
});

// POST /api/customers - Create new customer
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, email, phone, customerType, businessType, locations } =
      req.body;

    // Basic validation
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Customer name is required",
      });
    }

    // Enhanced validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address",
      });
    }

    if (phone && !/^[\d\s\-\(\)\+]+$/.test(phone)) {
      return res.status(400).json({
        error: "Please provide a valid phone number",
      });
    }

    const customerData = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      customerType: customerType || "commercial",
      businessType: businessType?.trim() || null,
      locations: locations || [],
    };

    const newCustomer = await databaseService.createCustomer(
      customerData,
      req.user.id
    );

    res.status(201).json({
      message: "Customer created successfully",
      customer: newCustomer,
    });
  } catch (error) {
    console.error("Error creating customer:", error);

    // Handle specific database errors
    if (error.message.includes("duplicate key")) {
      return res.status(409).json({
        error: "A customer with this email already exists",
      });
    }

    res.status(400).json({
      error: "Failed to create customer",
      details: error.message,
    });
  }
});

// PUT /api/customers/:id - Update customer
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { name, email, phone, customerType, businessType } = req.body;

    // Basic validation
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Customer name is required",
      });
    }

    // Enhanced validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address",
      });
    }

    if (phone && !/^[\d\s\-\(\)\+]+$/.test(phone)) {
      return res.status(400).json({
        error: "Please provide a valid phone number",
      });
    }

    const customerData = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      customerType: customerType || "commercial",
      businessType: businessType?.trim() || null,
    };

    const updatedCustomer = await databaseService.updateCustomer(
      req.params.id,
      customerData
    );

    if (!updatedCustomer) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    res.json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating customer:", error);

    // Handle specific database errors
    if (error.message.includes("duplicate key")) {
      return res.status(409).json({
        error: "A customer with this email already exists",
      });
    }

    res.status(400).json({
      error: "Failed to update customer",
      details: error.message,
    });
  }
});

// DELETE /api/customers/:id - Delete customer (soft delete)
router.delete("/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const customerId = req.params.id;

    // Check if customer exists first
    const existingCustomer = await databaseService.getCustomerById(customerId);
    if (!existingCustomer) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    // Perform soft delete
    const deleted = await databaseService.deleteCustomer(customerId);

    if (!deleted) {
      return res.status(500).json({
        error: "Failed to delete customer",
      });
    }

    res.json({
      message: "Customer deleted successfully",
      customer: {
        id: customerId,
        name: existingCustomer.name,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      error: "Failed to delete customer",
      details: error.message,
    });
  }
});

// POST /api/customers/:id/locations - Add location to customer
router.post("/:id/locations", authenticate, async (req, res) => {
  try {
    const customerId = req.params.id;
    const locationData = req.body;

    // Basic validation
    if (!locationData.streetAddress || !locationData.city) {
      return res.status(400).json({
        error: "Street address and city are required",
      });
    }

    // Check if customer exists
    const customer = await databaseService.getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    const newLocation = await databaseService.createCustomerLocation(
      customerId,
      locationData
    );

    res.status(201).json({
      message: "Location added successfully",
      location: newLocation,
    });
  } catch (error) {
    console.error("Error adding location:", error);
    res.status(400).json({
      error: "Failed to add location",
      details: error.message,
    });
  }
});

// PUT /api/customers/:customerId/locations/:locationId - Update location
router.put(
  "/:customerId/locations/:locationId",
  authenticate,
  async (req, res) => {
    try {
      const { customerId, locationId } = req.params;
      const locationData = req.body;

      // Basic validation
      if (!locationData.streetAddress || !locationData.city) {
        return res.status(400).json({
          error: "Street address and city are required",
        });
      }

      // TODO: Implement updateCustomerLocation method in databaseService
      // For now, return a placeholder response
      res.json({
        message: "Location update functionality coming in Phase 3",
        locationId,
        customerId,
      });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(400).json({
        error: "Failed to update location",
        details: error.message,
      });
    }
  }
);

export default router;
