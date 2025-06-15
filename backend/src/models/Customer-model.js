import databaseService from "../services/database-service.js";
import { logger } from "../utils/logger.js";

class CustomerModel {
  async create(customerData) {
    const {
      name,
      email,
      phone,
      business_type,
      customer_type,
      created_by,
      company_id,
    } = customerData;

    const query = `
      INSERT INTO customers (company_id, name, email, phone, business_type, customer_type, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    try {
      const result = await databaseService.get(query, [
        company_id,
        name,
        email,
        phone,
        business_type,
        customer_type || "commercial",
        created_by,
      ]);
      return result;
    } catch (error) {
      logger.error("Error creating customer:", error);
      throw error;
    }
  }

  async findById(customerId) {
    const query = "SELECT * FROM customers WHERE id = $1 AND is_active = TRUE";

    try {
      return await databaseService.get(query, [customerId]);
    } catch (error) {
      logger.error("Error finding customer by ID:", error);
      throw error;
    }
  }

  async findAll(filters = {}) {
    let query = `
      SELECT * FROM customers 
      WHERE is_active = TRUE
    `;
    const params = [];
    let paramCount = 0;

    // Apply filters
    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE ${paramCount} OR email ILIKE ${paramCount} OR phone ILIKE ${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.customerType) {
      paramCount++;
      query += ` AND customer_type = ${paramCount}`;
      params.push(filters.customerType);
    }

    if (filters.company_id) {
      paramCount++;
      query += ` AND company_id = ${paramCount}`;
      params.push(filters.company_id);
    }

    query += " ORDER BY name ASC";

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT ${paramCount}`;
      params.push(filters.limit);
    }

    try {
      return await databaseService.all(query, params);
    } catch (error) {
      logger.error("Error finding customers:", error);
      throw error;
    }
  }

  async update(customerId, customerData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic update query
    Object.keys(customerData).forEach((key) => {
      if (customerData[key] !== undefined) {
        paramCount++;
        fields.push(`${key} = ${paramCount}`);
        values.push(customerData[key]);
      }
    });

    if (fields.length === 0) {
      return this.findById(customerId);
    }

    // Add updated_at
    paramCount++;
    fields.push(`updated_at = ${paramCount}`);
    values.push(new Date());

    // Add customerId for WHERE clause
    paramCount++;
    values.push(customerId);

    const query = `UPDATE customers SET ${fields.join(
      ", "
    )} WHERE id = ${paramCount} RETURNING *`;

    try {
      return await databaseService.get(query, values);
    } catch (error) {
      logger.error("Error updating customer:", error);
      throw error;
    }
  }

  async delete(customerId) {
    // Soft delete - set is_active to false
    const query =
      "UPDATE customers SET is_active = FALSE, updated_at = NOW() WHERE id = $1";

    try {
      await databaseService.run(query, [customerId]);
    } catch (error) {
      logger.error("Error deleting customer:", error);
      throw error;
    }
  }

  // Customer location methods
  async addLocation(customerId, locationData) {
    const {
      address_type = "service",
      street_address,
      address_line_2,
      city,
      state,
      postal_code,
      country = "US",
      latitude,
      longitude,
      formatted_address,
      access_notes,
      is_primary = false,
      contact_person,
      contact_phone,
      service_hours,
    } = locationData;

    const query = `
      INSERT INTO customer_locations (
        customer_id, address_type, street_address, address_line_2, city, state, postal_code, country,
        latitude, longitude, formatted_address, access_notes, is_primary, 
        contact_person, contact_phone, service_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    try {
      const result = await databaseService.get(query, [
        customerId,
        address_type,
        street_address,
        address_line_2,
        city,
        state,
        postal_code,
        country,
        latitude,
        longitude,
        formatted_address,
        access_notes,
        is_primary,
        contact_person,
        contact_phone,
        service_hours,
      ]);

      return result;
    } catch (error) {
      logger.error("Error adding customer location:", error);
      throw error;
    }
  }

  async getCustomerLocations(customerId) {
    const query = `
      SELECT * FROM customer_locations 
      WHERE customer_id = $1 AND is_active = TRUE 
      ORDER BY is_primary DESC, created_at ASC
    `;

    try {
      return await databaseService.all(query, [customerId]);
    } catch (error) {
      logger.error("Error getting customer locations:", error);
      throw error;
    }
  }

  async getLocationById(locationId) {
    const query =
      "SELECT * FROM customer_locations WHERE id = $1 AND is_active = TRUE";

    try {
      return await databaseService.get(query, [locationId]);
    } catch (error) {
      logger.error("Error finding location by ID:", error);
      throw error;
    }
  }

  async updateLocation(locationId, locationData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(locationData).forEach((key) => {
      if (locationData[key] !== undefined) {
        paramCount++;
        fields.push(`${key} = ${paramCount}`);
        values.push(locationData[key]);
      }
    });

    if (fields.length === 0) {
      return this.getLocationById(locationId);
    }

    // Add updated_at
    paramCount++;
    fields.push(`updated_at = ${paramCount}`);
    values.push(new Date());

    // Add locationId for WHERE clause
    paramCount++;
    values.push(locationId);

    const query = `UPDATE customer_locations SET ${fields.join(
      ", "
    )} WHERE id = ${paramCount} RETURNING *`;

    try {
      return await databaseService.get(query, values);
    } catch (error) {
      logger.error("Error updating location:", error);
      throw error;
    }
  }

  async deleteLocation(locationId) {
    // Soft delete
    const query =
      "UPDATE customer_locations SET is_active = FALSE, updated_at = NOW() WHERE id = $1";

    try {
      await databaseService.run(query, [locationId]);
    } catch (error) {
      logger.error("Error deleting location:", error);
      throw error;
    }
  }

  // Get customers with locations using the optimized PostgreSQL query
  async getCustomersWithLocations(filters = {}) {
    return await databaseService.getCustomersWithLocations(filters);
  }

  // Spatial queries using PostGIS
  async findNearbyCustomers(longitude, latitude, radiusKm = 10, limit = 50) {
    return await databaseService.findNearbyLocations(
      longitude,
      latitude,
      radiusKm,
      limit
    );
  }
}

export default new CustomerModel();
