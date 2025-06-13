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
    const {
      name,
      email,
      phone,
      emails,
      phones,
      customerType,
      businessType,
      locations,
    } = req.body;

    // Basic validation
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Customer name is required",
      });
    }

    // Handle multiple emails - validate all of them
    const emailList =
      emails && Array.isArray(emails)
        ? emails.filter((e) => e.trim())
        : email
        ? [email]
        : [];

    for (const emailAddr of emailList) {
      if (emailAddr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) {
        return res.status(400).json({
          error: `Please provide a valid email address: ${emailAddr}`,
        });
      }
    }

    // Handle multiple phones - validate all of them
    const phoneList =
      phones && Array.isArray(phones)
        ? phones.filter((p) => p.trim())
        : phone
        ? [phone]
        : [];

    for (const phoneNum of phoneList) {
      if (phoneNum && !/^[\d\s\-\(\)\+]+$/.test(phoneNum)) {
        return res.status(400).json({
          error: `Please provide a valid phone number: ${phoneNum}`,
        });
      }
    }

    const customerData = {
      name: name.trim(),
      email: emailList[0] || null, // Use first email for backward compatibility
      phone: phoneList[0] || null, // Use first phone for backward compatibility
      emails: emailList, // Store all emails
      phones: phoneList, // Store all phones
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
    const { name, email, phone, emails, phones, customerType, businessType } =
      req.body;

    // Basic validation
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Customer name is required",
      });
    }

    // Handle multiple emails - validate all of them
    const emailList =
      emails && Array.isArray(emails)
        ? emails.filter((e) => e.trim())
        : email
        ? [email]
        : [];

    for (const emailAddr of emailList) {
      if (emailAddr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) {
        return res.status(400).json({
          error: `Please provide a valid email address: ${emailAddr}`,
        });
      }
    }

    // Handle multiple phones - validate all of them
    const phoneList =
      phones && Array.isArray(phones)
        ? phones.filter((p) => p.trim())
        : phone
        ? [phone]
        : [];

    for (const phoneNum of phoneList) {
      if (phoneNum && !/^[\d\s\-\(\)\+]+$/.test(phoneNum)) {
        return res.status(400).json({
          error: `Please provide a valid phone number: ${phoneNum}`,
        });
      }
    }

    const customerData = {
      name: name.trim(),
      email: emailList[0] || null, // Use first email for backward compatibility
      phone: phoneList[0] || null, // Use first phone for backward compatibility
      emails: emailList, // Store all emails
      phones: phoneList, // Store all phones
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

// PUT /api/customers/:id/locations/:locationId - Update location
router.put("/:id/locations/:locationId", authenticate, async (req, res) => {
  try {
    const { locationId } = req.params;
    const locationData = req.body;

    // Basic validation
    if (!locationData.streetAddress || !locationData.city) {
      return res.status(400).json({
        error: "Street address and city are required",
      });
    }

    const updatedLocation = await databaseService.updateCustomerLocation(
      locationId,
      locationData
    );

    if (!updatedLocation) {
      return res.status(404).json({
        error: "Location not found",
      });
    }

    res.json({
      message: "Location updated successfully",
      location: updatedLocation,
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(400).json({
      error: "Failed to update location",
      details: error.message,
    });
  }
});

// DELETE /api/customers/:id/locations/:locationId - Delete location
router.delete("/:id/locations/:locationId", authenticate, async (req, res) => {
  try {
    const { locationId } = req.params;

    const deleted = await databaseService.deleteCustomerLocation(locationId);

    if (!deleted) {
      return res.status(404).json({
        error: "Location not found",
      });
    }

    res.json({
      message: "Location deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({
      error: "Failed to delete location",
      details: error.message,
    });
  }
});

export default router;
