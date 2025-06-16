const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");
const auth = require("../middleware/auth");

// Get all customers with search and filtering
router.get("/customers", auth, async (req, res) => {
  try {
    const { search, status, tag, sort = "name", order = "asc" } = req.query;

    // Build query
    let query = { userId: req.user.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (tag) {
      query.tags = tag;
    }

    // Execute query with sorting
    const customers = await Customer.find(query)
      .sort({ [sort]: order === "asc" ? 1 : -1 })
      .lean();

    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Get single customer
router.get("/customers/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// Create customer
router.post("/customers", auth, async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      userId: req.user.id,
    };

    const customer = new Customer(customerData);
    await customer.save();

    res.status(201).json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// Update customer
router.put("/customers/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete customer
router.delete("/customers/:id", auth, async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// Get customer service history (placeholder for future work orders)
router.get("/customers/:id/service-history", auth, async (req, res) => {
  try {
    // This will be implemented in Phase 2 when work orders are added
    // For now, return empty array
    res.json([]);
  } catch (error) {
    console.error("Error fetching service history:", error);
    res.status(500).json({ error: "Failed to fetch service history" });
  }
});

module.exports = router;

// backend/models/Customer.js - Customer model schema
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zip: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "Primary",
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
});

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    addresses: {
      type: [addressSchema],
      validate: {
        validator: function (addresses) {
          return addresses && addresses.length > 0;
        },
        message: "At least one address is required",
      },
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one primary address
customerSchema.pre("save", function (next) {
  const primaryAddresses = this.addresses.filter((addr) => addr.isPrimary);
  if (primaryAddresses.length === 0 && this.addresses.length > 0) {
    this.addresses[0].isPrimary = true;
  } else if (primaryAddresses.length > 1) {
    // Keep only the first primary, set others to false
    this.addresses.forEach((addr, index) => {
      if (index > 0 && addr.isPrimary) {
        addr.isPrimary = false;
      }
    });
  }
  next();
});

// Index for search optimization
customerSchema.index({ name: "text", email: "text", company: "text" });
customerSchema.index({ userId: 1, status: 1 });
customerSchema.index({ userId: 1, tags: 1 });

module.exports = mongoose.model("Customer", customerSchema);
