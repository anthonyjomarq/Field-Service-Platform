import databaseService from "../services/database-service.js";
import { logger } from "../utils/logger.js";

class RouteModel {
  async create(routeData) {
    const {
      name,
      scheduled_date,
      origin,
      total_distance,
      total_duration,
      status = "planned",
    } = routeData;

    const query = `
      INSERT INTO routes (name, scheduled_date, origin, total_distance, total_duration, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    try {
      const result = await databaseService.get(query, [
        name,
        scheduled_date,
        origin,
        total_distance,
        total_duration,
        status,
      ]);
      return result;
    } catch (error) {
      logger.error("Error creating route:", error);
      throw error;
    }
  }

  async findById(routeId) {
    const query = "SELECT * FROM routes WHERE id = $1";

    try {
      return await databaseService.get(query, [routeId]);
    } catch (error) {
      logger.error("Error finding route by ID:", error);
      throw error;
    }
  }

  async findAll() {
    const query =
      "SELECT * FROM routes ORDER BY scheduled_date DESC, created_at DESC";

    try {
      return await databaseService.all(query);
    } catch (error) {
      logger.error("Error finding all routes:", error);
      throw error;
    }
  }

  async addStop(routeId, stopData) {
    const {
      customerId,
      customerName,
      address,
      stopOrder,
      estimatedArrival,
      travelTime,
      distance,
    } = stopData;

    const query = `
      INSERT INTO route_stops (route_id, customer_id, customer_name, address, stop_order, estimated_arrival, travel_time, distance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    try {
      const result = await databaseService.get(query, [
        routeId,
        customerId,
        customerName,
        address,
        stopOrder,
        estimatedArrival,
        travelTime,
        distance,
      ]);
      return result;
    } catch (error) {
      logger.error("Error adding route stop:", error);
      throw error;
    }
  }

  async getRouteStops(routeId) {
    const query =
      "SELECT * FROM route_stops WHERE route_id = $1 ORDER BY stop_order ASC";

    try {
      return await databaseService.all(query, [routeId]);
    } catch (error) {
      logger.error("Error getting route stops:", error);
      throw error;
    }
  }

  async update(routeId, routeData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(routeData).forEach((key) => {
      if (routeData[key] !== undefined) {
        paramCount++;
        fields.push(`${key} = ${paramCount}`);
        values.push(routeData[key]);
      }
    });

    if (fields.length === 0) {
      return this.findById(routeId);
    }

    // Add routeId for WHERE clause
    paramCount++;
    values.push(routeId);

    const query = `UPDATE routes SET ${fields.join(
      ", "
    )} WHERE id = ${paramCount} RETURNING *`;

    try {
      return await databaseService.get(query, values);
    } catch (error) {
      logger.error("Error updating route:", error);
      throw error;
    }
  }

  async delete(routeId) {
    try {
      // Use transaction to delete route and stops
      await databaseService.transaction(async (client) => {
        // Delete route stops first
        await client.query("DELETE FROM route_stops WHERE route_id = $1", [
          routeId,
        ]);

        // Delete route
        await client.query("DELETE FROM routes WHERE id = $1", [routeId]);
      });
    } catch (error) {
      logger.error("Error deleting route:", error);
      throw error;
    }
  }

  // Route optimization cache methods
  async getCachedRoute(routeKey) {
    const query = `
      SELECT route_data, distance_matrix 
      FROM route_cache 
      WHERE route_key = $1 AND expires_at > NOW()
    `;

    try {
      return await databaseService.get(query, [routeKey]);
    } catch (error) {
      logger.error("Error getting cached route:", error);
      return null;
    }
  }

  async setCachedRoute(routeKey, routeData, distanceMatrix = null) {
    const query = `
      INSERT INTO route_cache (route_key, route_data, distance_matrix)
      VALUES ($1, $2, $3)
      ON CONFLICT (route_key) DO UPDATE SET
        route_data = EXCLUDED.route_data,
        distance_matrix = EXCLUDED.distance_matrix,
        created_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
    `;

    try {
      await databaseService.run(query, [
        routeKey,
        JSON.stringify(routeData),
        distanceMatrix ? JSON.stringify(distanceMatrix) : null,
      ]);
    } catch (error) {
      logger.error("Error caching route:", error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  async clearExpiredCache() {
    const query = "DELETE FROM route_cache WHERE expires_at <= NOW()";

    try {
      const result = await databaseService.run(query);
      if (result.rowCount > 0) {
        logger.info(`Cleared ${result.rowCount} expired route cache entries`);
      }
    } catch (error) {
      logger.error("Error clearing expired cache:", error);
    }
  }
}

export default new RouteModel();
