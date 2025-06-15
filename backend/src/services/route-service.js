import { ValidationError } from "../utils/errors.js";
import customerService from "./customer-service.js";
import googleMapsService from "./googleMaps-service.js";
import routeModel from "../models/Route-model.js";
import { logger } from "../utils/logger.js";
import crypto from "crypto";

class RouteService {
  async getCustomersForRoutes(filters = {}) {
    try {
      // Get customers with their locations for route planning
      const result = await customerService.getCustomers(filters);

      // Filter customers that have valid addresses and coordinates
      const customersWithAddresses = result.customers.filter(
        (customer) =>
          customer.locations &&
          customer.locations.length > 0 &&
          customer.locations.some(
            (loc) => loc.street_address && loc.latitude && loc.longitude
          )
      );

      return {
        customers: customersWithAddresses,
        total: customersWithAddresses.length,
      };
    } catch (error) {
      logger.error("Error fetching customers for routes:", error);
      throw error;
    }
  }

  async optimizeRoute(routeData) {
    const { origin, customerIds, routeName, scheduledDate } = routeData;

    // Validation
    if (
      !origin ||
      !customerIds ||
      !Array.isArray(customerIds) ||
      customerIds.length === 0
    ) {
      throw new ValidationError("Origin and customer IDs are required");
    }

    try {
      // Generate cache key for this route request
      const routeKey = this.generateRouteKey(origin, customerIds);

      // Check cache first
      const cachedRoute = await routeModel.getCachedRoute(routeKey);
      if (cachedRoute) {
        logger.info("Returning cached route optimization");
        return JSON.parse(cachedRoute.route_data);
      }

      // Get customer details and locations
      const customers = await Promise.all(
        customerIds.map((id) => customerService.getCustomerById(id))
      );

      // Extract addresses for route optimization
      const destinations = [];
      const customerLocations = [];

      customers.forEach((customer) => {
        if (!customer) return;

        // Use primary location or first location with coordinates
        const primaryLocation =
          customer.locations.find((loc) => loc.is_primary) ||
          customer.locations.find((loc) => loc.latitude && loc.longitude) ||
          customer.locations[0];

        if (primaryLocation) {
          const address =
            primaryLocation.formatted_address ||
            `${primaryLocation.street_address}, ${primaryLocation.city}, ${primaryLocation.state} ${primaryLocation.postal_code}`;

          destinations.push(address);
          customerLocations.push({
            customerId: customer.id,
            customerName: customer.name,
            address: address,
            locationId: primaryLocation.id,
            accessNotes: primaryLocation.access_notes,
            latitude: primaryLocation.latitude,
            longitude: primaryLocation.longitude,
          });
        }
      });

      if (destinations.length === 0) {
        throw new ValidationError("No valid customer addresses found");
      }

      // Optimize route using Google Maps
      const optimizedRoute = await googleMapsService.optimizeRoute(
        origin,
        destinations
      );

      // Map the optimized route back to customer data
      const routeWithCustomers = {
        id: `route_${Date.now()}`,
        name: routeName || `Route ${new Date().toLocaleDateString()}`,
        scheduledDate: scheduledDate || new Date().toISOString(),
        origin: origin,
        totalDistance: optimizedRoute.totalDistance,
        totalDuration: optimizedRoute.totalDuration,
        stops: optimizedRoute.waypoints.map((waypoint, index) => ({
          order: index + 1,
          customer: customerLocations[waypoint.waypointIndex],
          estimatedArrival: waypoint.estimatedArrival,
          travelTime: waypoint.travelTime,
          distance: waypoint.distance,
        })),
        polyline: optimizedRoute.polyline,
        bounds: optimizedRoute.bounds,
        optimizedOrder: optimizedRoute.waypointOrder,
      };

      // Cache the result
      await routeModel.setCachedRoute(routeKey, routeWithCustomers);

      logger.info(
        `Route optimized: ${routeWithCustomers.name} with ${destinations.length} stops`
      );

      return routeWithCustomers;
    } catch (error) {
      logger.error("Error optimizing route:", error);
      throw error;
    }
  }

  async getRouteHistory() {
    try {
      const routes = await routeModel.findAll();

      // Transform for frontend compatibility
      return routes.map((route) => ({
        id: route.id,
        name: route.name,
        date: route.scheduled_date || route.created_at,
        customerCount: 0, // TODO: Count stops
        totalDistance: route.total_distance || "0 km",
        totalDuration: route.total_duration || "0 mins",
        status: route.status || "completed",
      }));
    } catch (error) {
      logger.error("Error fetching route history:", error);
      throw error;
    }
  }

  async saveRoute(routeData) {
    try {
      const route = await routeModel.create({
        name: routeData.name,
        scheduled_date: routeData.scheduledDate,
        origin: routeData.origin,
        total_distance: routeData.totalDistance,
        total_duration: routeData.totalDuration,
        status: "planned",
      });

      // Save route stops
      if (routeData.stops && routeData.stops.length > 0) {
        await Promise.all(
          routeData.stops.map((stop) =>
            routeModel.addStop(route.id, {
              customerId: stop.customer.customerId,
              customerName: stop.customer.customerName,
              address: stop.customer.address,
              stopOrder: stop.order,
              estimatedArrival: stop.estimatedArrival,
              travelTime: stop.travelTime,
              distance: stop.distance,
            })
          )
        );
      }

      logger.info(`Route saved: ${route.name} (ID: ${route.id})`);
      return route;
    } catch (error) {
      logger.error("Error saving route:", error);
      throw error;
    }
  }

  generateRouteKey(origin, customerIds) {
    const data = `${origin}_${customerIds.sort().join("_")}`;
    return crypto.createHash("md5").update(data).digest("hex");
  }

  // Cleanup expired cache entries (call periodically)
  async cleanupCache() {
    await routeModel.clearExpiredCache();
  }
}

export default new RouteService();
