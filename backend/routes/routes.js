import express from "express";
import databaseService from "../services/databaseService.js";
import { authenticate } from "../middleware/auth.js";
import axios from "axios";

const router = express.Router();

// Google Maps API helper
const optimizeRoute = async (origin, destinations) => {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin,
          destination: origin, // Return to origin (circular route)
          waypoints: `optimize:true|${destinations.join("|")}`,
          mode: "driving",
          key: process.env.GOOGLE_API_KEY,
        },
      }
    );

    if (response.data.status !== "OK") {
      throw new Error(`Google Directions API error: ${response.data.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Route optimization error:", error);
    throw error;
  }
};

// GET /api/routes/customers - Get customers for route planning
router.get("/customers", authenticate, async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    const filters = {};
    if (search) filters.search = search;
    filters.limit = parseInt(limit);

    const customers = await databaseService.getCustomers(
      req.user.companyId || "550e8400-e29b-41d4-a716-446655440000",
      filters
    );

    // Format for route planning (include locations)
    const customersWithLocations = await Promise.all(
      customers.map(async (customer) => {
        const fullCustomer = await databaseService.getCustomerById(customer.id);
        return {
          id: fullCustomer.id,
          name: fullCustomer.name,
          email: fullCustomer.email,
          phone: fullCustomer.phone,
          business_type: fullCustomer.business_type,
          locations: fullCustomer.locations || [],
        };
      })
    );

    res.json({
      customers: customersWithLocations,
      total: customersWithLocations.length,
    });
  } catch (error) {
    console.error("Error fetching customers for routes:", error);
    res.status(500).json({
      error: "Failed to fetch customers",
      details: error.message,
    });
  }
});

// POST /api/routes/optimize - Enhanced route optimization
router.post("/optimize", authenticate, async (req, res) => {
  try {
    const { origin, customerIds, routeName, scheduledDate } = req.body;

    // Validation
    if (
      !origin ||
      !customerIds ||
      !Array.isArray(customerIds) ||
      customerIds.length === 0
    ) {
      return res.status(400).json({
        error: "Origin and customer IDs are required",
      });
    }

    // Get customer details and locations
    const customers = await Promise.all(
      customerIds.map((id) => databaseService.getCustomerById(id))
    );

    // Extract addresses for route optimization
    const destinations = [];
    const customerLocations = [];

    customers.forEach((customer) => {
      if (!customer) return;

      // Use primary location or first location
      const primaryLocation =
        customer.locations.find((loc) => loc.is_primary) ||
        customer.locations[0];

      if (primaryLocation) {
        destinations.push(primaryLocation.address);
        customerLocations.push({
          customerId: customer.id,
          customerName: customer.name,
          address: primaryLocation.address,
          locationId: primaryLocation.id,
          accessNotes: primaryLocation.access_notes,
        });
      }
    });

    if (destinations.length === 0) {
      return res.status(400).json({
        error: "No valid customer locations found",
      });
    }

    // Optimize route using Google Maps
    const routeData = await optimizeRoute(origin, destinations);

    // Format response with customer information
    const optimizedRoute = {
      id: Date.now().toString(), // Simple ID for now
      routeName: routeName || `Route ${new Date().toLocaleDateString()}`,
      origin,
      destinations,
      customerLocations,
      scheduledDate: scheduledDate || new Date().toISOString(),
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      googleMapsData: routeData,
      stats: {
        totalCustomers: customers.length,
        totalDistance:
          routeData.routes[0]?.legs.reduce(
            (sum, leg) => sum + leg.distance.value,
            0
          ) || 0,
        totalDuration:
          routeData.routes[0]?.legs.reduce(
            (sum, leg) => sum + leg.duration.value,
            0
          ) || 0,
      },
    };

    // TODO: Save route to database

    res.json({
      message: "Route optimized successfully",
      route: optimizedRoute,
    });
  } catch (error) {
    console.error("Route optimization error:", error);
    res.status(500).json({
      error: "Failed to optimize route",
      details: error.message,
    });
  }
});

// GET /api/routes/history - Get route history
router.get("/history", authenticate, async (req, res) => {
  try {
    // TODO: Implement route history from database
    res.json({
      routes: [],
      message: "Route history feature coming soon",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch route history",
    });
  }
});

export default router;
