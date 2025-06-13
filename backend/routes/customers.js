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

    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Customer name is required",
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
    res.status(400).json({
      error: "Failed to update customer",
      details: error.message,
    });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "dispatcher"]),
  async (req, res) => {
    try {
      const deleted = await databaseService.deleteCustomer(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          error: "Customer not found",
        });
      }

      res.json({
        message: "Customer deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({
        error: "Failed to delete customer",
        details: error.message,
      });
    }
  }
);

export default router;
