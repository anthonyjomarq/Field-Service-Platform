import { NotFoundError, ValidationError } from "../utils/errors.js";
import customerModel from "../models/Customer-model.js";
import { logger } from "../utils/logger.js";

class CustomerService {
  async getCustomers(filters = {}) {
    try {
      // Use the optimized PostgreSQL query that gets customers with locations
      const customers = await customerModel.getCustomersWithLocations(filters);

      // Transform the data to match frontend expectations
      const transformedCustomers = customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        business_type: customer.business_type,
        customer_type: customer.customer_type,
        locations: customer.locations || [],
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      }));

      return {
        customers: transformedCustomers,
        total: transformedCustomers.length,
      };
    } catch (error) {
      logger.error("Error fetching customers:", error);
      throw error;
    }
  }

  async getCustomerById(customerId) {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    const customer = await customerModel.findById(customerId);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    // Get customer locations
    const locations = await customerModel.getCustomerLocations(customerId);

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      business_type: customer.business_type,
      customer_type: customer.customer_type,
      locations: locations || [],
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };
  }

  async createCustomer(customerData, userId = null) {
    const {
      name,
      email,
      phone,
      business_type,
      customer_type,
      locations = [],
    } = customerData;

    // Validation
    if (!name || !email) {
      throw new ValidationError("Name and email are required");
    }

    // For now, use default company and user IDs if not provided
    const defaultCompanyId = "11111111-1111-1111-1111-111111111111";
    const defaultUserId = userId || "11111111-1111-1111-1111-111111111111";

    // Create customer
    const customer = await customerModel.create({
      name,
      email,
      phone,
      business_type: business_type || "commercial",
      customer_type: customer_type || "commercial",
      created_by: defaultUserId,
      company_id: defaultCompanyId,
    });

    // Add locations if provided
    if (locations.length > 0) {
      await Promise.all(
        locations.map((location, index) =>
          customerModel.addLocation(customer.id, {
            ...location,
            is_primary: index === 0, // First location is primary
          })
        )
      );
    }

    logger.info(`Customer created: ${customer.name} (ID: ${customer.id})`);

    // Return customer with locations
    return this.getCustomerById(customer.id);
  }

  async updateCustomer(customerId, customerData) {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    // Check if customer exists
    const existingCustomer = await customerModel.findById(customerId);
    if (!existingCustomer) {
      throw new NotFoundError("Customer not found");
    }

    // Update customer
    const updatedCustomer = await customerModel.update(
      customerId,
      customerData
    );

    logger.info(
      `Customer updated: ${updatedCustomer.name} (ID: ${customerId})`
    );

    // Return customer with locations
    return this.getCustomerById(customerId);
  }

  async deleteCustomer(customerId) {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    // Check if customer exists
    const existingCustomer = await customerModel.findById(customerId);
    if (!existingCustomer) {
      throw new NotFoundError("Customer not found");
    }

    // Soft delete customer (this will also handle related locations)
    await customerModel.delete(customerId);

    logger.info(
      `Customer deleted: ${existingCustomer.name} (ID: ${customerId})`
    );
  }

  // Location management methods
  async addCustomerLocation(customerId, locationData) {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    // Check if customer exists
    const customer = await customerModel.findById(customerId);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    const location = await customerModel.addLocation(customerId, locationData);
    logger.info(`Location added for customer ${customerId}: ${location.id}`);

    return location;
  }

  async updateCustomerLocation(locationId, locationData) {
    if (!locationId) {
      throw new ValidationError("Location ID is required");
    }

    const location = await customerModel.updateLocation(
      locationId,
      locationData
    );
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    logger.info(`Location updated: ${locationId}`);
    return location;
  }

  async deleteCustomerLocation(locationId) {
    if (!locationId) {
      throw new ValidationError("Location ID is required");
    }

    // Check if location exists
    const location = await customerModel.getLocationById(locationId);
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    await customerModel.deleteLocation(locationId);
    logger.info(`Location deleted: ${locationId}`);
  }

  // Spatial queries for route optimization
  async findNearbyCustomers(longitude, latitude, radiusKm = 10, limit = 50) {
    try {
      return await customerModel.findNearbyCustomers(
        longitude,
        latitude,
        radiusKm,
        limit
      );
    } catch (error) {
      logger.error("Error finding nearby customers:", error);
      throw error;
    }
  }
}

export default new CustomerService();
