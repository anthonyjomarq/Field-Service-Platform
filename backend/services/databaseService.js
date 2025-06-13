import pkg from "pg";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  // Initialize database connection
  async initialize() {
    try {
      this.pool = new Pool({
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "field_service",
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
      });

      // Test connection
      const client = await this.pool.connect();
      console.log("✅ PostgreSQL connected successfully");

      // Test PostGIS
      const postgisTest = await client.query("SELECT PostGIS_Version();");
      console.log("✅ PostGIS available:", postgisTest.rows[0].postgis_version);

      client.release();

      // Create tables
      await this.createTables();

      return this.pool;
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  // Create tables from schema
  async createTables() {
    try {
      const schemaPath = path.join(__dirname, "../database/schema.sql");
      const schema = await fs.readFile(schemaPath, "utf8");

      await this.pool.query(schema);
      console.log("✅ Database tables created/verified");

      // **FIX 4: Ensure contact_info column exists for multiple contacts support**
      await this.ensureContactInfoColumn();

      // Run initial data
      try {
        const initPath = path.join(__dirname, "../database/init.sql");
        const initData = await fs.readFile(initPath, "utf8");
        await this.pool.query(initData);
        console.log("✅ Initial data loaded");
      } catch (error) {
        console.log("ℹ️  Initial data already exists or skipped");
      }
    } catch (error) {
      console.error("❌ Error creating tables:", error);
      throw error;
    }
  }

  // **FIX 4: Ensure contact_info column exists for multiple emails/phones support**
  async ensureContactInfoColumn() {
    try {
      // Add contact_info column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS contact_info JSONB;
      `);

      // Create index on contact_info for better query performance
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_contact_info 
        ON customers USING GIN (contact_info);
      `);

      console.log("✅ Contact info column ensured");
    } catch (error) {
      console.warn("⚠️ Could not ensure contact_info column:", error.message);
    }
  }

  // **FIX 4: Helper method to check if contact_info column exists**
  async checkContactInfoColumn(client = null) {
    try {
      const useClient = client || this.pool;
      const result = await useClient.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'contact_info'
      `);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  // **FIX 4: Helper method to parse customer contact info**
  parseCustomerContactInfo(customer) {
    if (customer.contact_info) {
      try {
        const contactData =
          typeof customer.contact_info === "string"
            ? JSON.parse(customer.contact_info)
            : customer.contact_info;
        customer.emails = contactData.emails || [];
        customer.phones = contactData.phones || [];
      } catch (error) {
        console.warn(
          "Error parsing contact info for customer:",
          customer.id,
          error
        );
        customer.emails = customer.email ? [customer.email] : [];
        customer.phones = customer.phone ? [customer.phone] : [];
      }
    } else {
      // Fallback for customers without contact_info JSON
      customer.emails = customer.email ? [customer.email] : [];
      customer.phones = customer.phone ? [customer.phone] : [];
    }
    return customer;
  }

  // ============================================================================
  // CUSTOMER OPERATIONS (Enhanced with multiple contacts support)
  // ============================================================================

  async createCustomer(customerData, userId) {
    const {
      name,
      email,
      phone,
      emails,
      phones,
      customerType,
      businessType,
      locations = [],
    } = customerData;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // **FIX 4: Prepare contact information JSON with proper fallbacks**
      const contactInfo = {
        emails: emails && emails.length > 0 ? emails : email ? [email] : [],
        phones: phones && phones.length > 0 ? phones : phone ? [phone] : [],
      };

      // Check if contact_info column exists
      const hasContactInfo = await this.checkContactInfoColumn(client);

      let customerResult;
      if (hasContactInfo) {
        // Insert customer with contact_info support
        customerResult = await client.query(
          `
          INSERT INTO customers (
            company_id, name, email, phone, customer_type, business_type, 
            created_by, is_active, contact_info
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
          `,
          [
            "550e8400-e29b-41d4-a716-446655440000", // Default company ID
            name,
            email || (emails && emails[0]) || null, // Primary email for backward compatibility
            phone || (phones && phones[0]) || null, // Primary phone for backward compatibility
            customerType,
            businessType,
            userId,
            true,
            JSON.stringify(contactInfo), // Store all contact info as JSON
          ]
        );
      } else {
        // Fallback for databases without contact_info column
        customerResult = await client.query(
          `
          INSERT INTO customers (
            company_id, name, email, phone, customer_type, business_type, 
            created_by, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
          `,
          [
            "550e8400-e29b-41d4-a716-446655440000", // Default company ID
            name,
            email || (emails && emails[0]) || null,
            phone || (phones && phones[0]) || null,
            customerType,
            businessType,
            userId,
            true,
          ]
        );
      }

      const customer = customerResult.rows[0];

      // Insert locations if provided
      for (const location of locations) {
        await this.createCustomerLocation(customer.id, location, client);
      }

      await client.query("COMMIT");

      // **FIX 2: Return fresh data with proper counts**
      return await this.getCustomerById(customer.id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // **FIX 2: Enhanced getCustomers with proper location/equipment counts**
  async getCustomers(
    companyId = "550e8400-e29b-41d4-a716-446655440000",
    filters = {}
  ) {
    let query = `
      SELECT c.*, 
             COUNT(DISTINCT cl.id) as location_count,
             COUNT(DISTINCT ce.id) as equipment_count,
             u.first_name as created_by_name,
             u.last_name as created_by_lastname
      FROM customers c
      LEFT JOIN customer_locations cl ON c.id = cl.customer_id AND cl.is_active = TRUE
      LEFT JOIN customer_equipment ce ON c.id = ce.customer_id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.company_id = $1 AND c.is_active = TRUE
    `;

    const params = [companyId];
    let paramCount = 1;

    if (filters.search) {
      paramCount++;
      query += ` AND (c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.customerType) {
      paramCount++;
      query += ` AND c.customer_type = $${paramCount}`;
      params.push(filters.customerType);
    }

    if (filters.businessType) {
      paramCount++;
      query += ` AND c.business_type = $${paramCount}`;
      params.push(filters.businessType);
    }

    query += ` GROUP BY c.id, u.first_name, u.last_name ORDER BY c.created_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    console.log("🔍 Executing getCustomers query:", { query, params });
    const result = await this.pool.query(query, params);

    // **FIX 4: Parse contact info for each customer**
    return result.rows.map((customer) => {
      this.parseCustomerContactInfo(customer);
      return customer;
    });
  }

  // **FIX 2: Enhanced getCustomerById with proper location/equipment counts**
  async getCustomerById(customerId) {
    // Get customer with counts
    const customerResult = await this.pool.query(
      `
      SELECT c.*, u.first_name as created_by_name, u.last_name as created_by_lastname,
             COUNT(DISTINCT cl.id) as location_count,
             COUNT(DISTINCT ce.id) as equipment_count
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN customer_locations cl ON c.id = cl.customer_id AND cl.is_active = TRUE
      LEFT JOIN customer_equipment ce ON c.id = ce.customer_id
      WHERE c.id = $1 AND c.is_active = TRUE
      GROUP BY c.id, u.first_name, u.last_name
      `,
      [customerId]
    );

    if (customerResult.rows.length === 0) return null;

    const customer = customerResult.rows[0];

    // **FIX 4: Parse contact info and add to customer object**
    this.parseCustomerContactInfo(customer);

    // Get locations with spatial data
    const locationsResult = await this.pool.query(
      `
      SELECT *,
             ST_X(geom) as longitude,
             ST_Y(geom) as latitude,
             ST_AsText(geom) as geom_text
      FROM customer_locations 
      WHERE customer_id = $1 AND is_active = TRUE
      ORDER BY is_primary DESC, created_at ASC
      `,
      [customerId]
    );

    // Get equipment
    const equipmentResult = await this.pool.query(
      `
      SELECT * FROM customer_equipment WHERE customer_id = $1 ORDER BY created_at DESC
      `,
      [customerId]
    );

    return {
      ...customer,
      locations: locationsResult.rows,
      equipment: equipmentResult.rows,
      location_count: locationsResult.rows.length,
      equipment_count: equipmentResult.rows.length,
    };
  }

  // **FIX 1 & 4: Enhanced updateCustomer with proper contact handling**
  async updateCustomer(customerId, customerData) {
    const { name, email, phone, emails, phones, customerType, businessType } =
      customerData;

    console.log("📝 Updating customer:", { customerId, customerData });

    // Check if contact_info column exists
    const hasContactInfo = await this.checkContactInfoColumn();

    let result;
    if (hasContactInfo) {
      // **FIX 1: Prepare contact information JSON with enhanced logic**
      const contactInfo = {
        emails: emails && emails.length > 0 ? emails : email ? [email] : [],
        phones: phones && phones.length > 0 ? phones : phone ? [phone] : [],
      };

      console.log("💾 Saving contact info:", contactInfo);

      result = await this.pool.query(
        `
        UPDATE customers 
        SET 
          name = $1,
          email = $2,
          phone = $3,
          customer_type = $4,
          business_type = $5,
          contact_info = $6,
          updated_at = NOW()
        WHERE id = $7 AND is_active = TRUE
        RETURNING *
        `,
        [
          name,
          email || (emails && emails[0]) || null, // Primary email for backward compatibility
          phone || (phones && phones[0]) || null, // Primary phone for backward compatibility
          customerType,
          businessType,
          JSON.stringify(contactInfo), // Store all contact info as JSON
          customerId,
        ]
      );
    } else {
      // Fallback for databases without contact_info column
      result = await this.pool.query(
        `
        UPDATE customers 
        SET 
          name = $1,
          email = $2,
          phone = $3,
          customer_type = $4,
          business_type = $5,
          updated_at = NOW()
        WHERE id = $6 AND is_active = TRUE
        RETURNING *
        `,
        [
          name,
          email || (emails && emails[0]) || null,
          phone || (phones && phones[0]) || null,
          customerType,
          businessType,
          customerId,
        ]
      );
    }

    if (result.rows.length === 0) return null;

    // **FIX 2: Return fresh data with updated counts**
    console.log("✅ Customer updated, returning fresh data");
    return await this.getCustomerById(customerId);
  }

  async deleteCustomer(customerId) {
    // Soft delete - don't actually remove data
    const result = await this.pool.query(
      `
      UPDATE customers 
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [customerId]
    );
    return result.rowCount > 0;
  }

  // ============================================================================
  // LOCATION OPERATIONS (Enhanced with spatial support)
  // ============================================================================

  async createCustomerLocation(customerId, locationData, client = null) {
    const useClient = client || this.pool;

    const {
      addressType = "service",
      address, // Legacy field
      streetAddress,
      addressLine2,
      city,
      state,
      zipCode, // Legacy field
      postalCode,
      country = "US",
      accessNotes,
      gateCode,
      contactPerson,
      contactPhone,
      serviceHours,
      isPrimary = false,
      latitude,
      longitude,
    } = locationData;

    // Use streetAddress if provided, otherwise fall back to address
    const finalStreetAddress =
      streetAddress || address || "Address Needs Update";
    const finalPostalCode = postalCode || zipCode;

    const result = await useClient.query(
      `
      INSERT INTO customer_locations (
        customer_id, address_type, address, street_address, address_line_2, city, state, 
        zip_code, postal_code, country, access_notes, gate_code, contact_person, 
        contact_phone, service_hours, is_primary, latitude, longitude, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
      `,
      [
        customerId,
        addressType,
        finalStreetAddress,
        finalStreetAddress,
        addressLine2,
        city,
        state,
        finalPostalCode,
        finalPostalCode,
        country,
        accessNotes,
        gateCode,
        contactPerson,
        contactPhone,
        serviceHours,
        isPrimary,
        latitude,
        longitude,
        true,
      ]
    );

    return result.rows[0];
  }

  async updateCustomerLocation(locationId, locationData) {
    const {
      addressType,
      streetAddress,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      accessNotes,
      gateCode,
      contactPerson,
      contactPhone,
      serviceHours,
      isPrimary,
      latitude,
      longitude,
    } = locationData;

    const result = await this.pool.query(
      `
      UPDATE customer_locations
      SET 
        address_type = COALESCE($1, address_type),
        street_address = COALESCE($2, street_address),
        address = COALESCE($2, address),
        address_line_2 = $3,
        city = COALESCE($4, city),
        state = COALESCE($5, state),
        postal_code = COALESCE($6, postal_code),
        zip_code = COALESCE($6, zip_code),
        country = COALESCE($7, country),
        access_notes = $8,
        gate_code = $9,
        contact_person = $10,
        contact_phone = $11,
        service_hours = $12,
        is_primary = COALESCE($13, is_primary),
        latitude = $14,
        longitude = $15,
        updated_at = NOW()
      WHERE id = $16 AND is_active = TRUE
      RETURNING *
      `,
      [
        addressType,
        streetAddress,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        accessNotes,
        gateCode,
        contactPerson,
        contactPhone,
        serviceHours,
        isPrimary,
        latitude,
        longitude,
        locationId,
      ]
    );

    return result.rows[0] || null;
  }

  async deleteCustomerLocation(locationId) {
    const result = await this.pool.query(
      `
      UPDATE customer_locations 
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [locationId]
    );
    return result.rowCount > 0;
  }

  async updateLocationGeometry(
    locationId,
    latitude,
    longitude,
    geocodingData = {}
  ) {
    const {
      addressComponents,
      confidence,
      accuracy,
      plusCode,
      formattedAddress,
    } = geocodingData;

    const query = `
      UPDATE customer_locations 
      SET 
        latitude = $1, 
        longitude = $2,
        geom = ST_SetSRID(ST_MakePoint($2, $1), 4326),
        address_components = $3,
        geocoding_confidence = $4,
        geocoding_accuracy = $5,
        plus_code = $6,
        formatted_address = $7,
        last_verified = NOW(),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      latitude,
      longitude,
      JSON.stringify(addressComponents),
      confidence,
      accuracy,
      plusCode,
      formattedAddress,
      locationId,
    ]);

    return result.rows[0];
  }

  // ============================================================================
  // SPATIAL OPERATIONS (For route optimization)
  // ============================================================================

  async getCustomersWithinRadius(centerLat, centerLng, radiusKm = 50) {
    const query = `
      SELECT c.*, cl.*,
             ST_Distance(
               cl.geom, 
               ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
             ) / 1000 as distance_km
      FROM customers c
      JOIN customer_locations cl ON c.id = cl.customer_id
      WHERE cl.geom IS NOT NULL 
        AND cl.is_active = TRUE 
        AND c.is_active = TRUE
        AND ST_DWithin(
          cl.geom::geography, 
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, 
          $3 * 1000
        )
      ORDER BY distance_km ASC
    `;

    const result = await this.pool.query(query, [
      centerLat,
      centerLng,
      radiusKm,
    ]);
    return result.rows;
  }

  async getCustomerLocationsForRoute(customerIds = []) {
    if (customerIds.length === 0) {
      // Get all active locations with coordinates
      const query = `
        SELECT c.name as customer_name, cl.*,
               ST_X(cl.geom) as longitude,
               ST_Y(cl.geom) as latitude
        FROM customer_locations cl
        JOIN customers c ON cl.customer_id = c.id
        WHERE cl.is_active = TRUE 
          AND c.is_active = TRUE
          AND cl.geom IS NOT NULL
        ORDER BY cl.is_primary DESC, c.name ASC
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } else {
      // Get locations for specific customers
      const placeholders = customerIds
        .map((_, index) => `$${index + 1}`)
        .join(",");
      const query = `
        SELECT c.name as customer_name, cl.*,
               ST_X(cl.geom) as longitude,
               ST_Y(cl.geom) as latitude
        FROM customer_locations cl
        JOIN customers c ON cl.customer_id = c.id
        WHERE cl.customer_id IN (${placeholders})
          AND cl.is_active = TRUE 
          AND c.is_active = TRUE
          AND cl.geom IS NOT NULL
        ORDER BY cl.is_primary DESC, c.name ASC
      `;

      const result = await this.pool.query(query, customerIds);
      return result.rows;
    }
  }

  // ============================================================================
  // EQUIPMENT OPERATIONS
  // ============================================================================

  async createCustomerEquipment(customerId, equipmentData) {
    const {
      locationId,
      equipmentType,
      brand,
      model,
      serialNumber,
      installDate,
      warrantyExpiry,
      serviceIntervalDays = 90,
      notes,
    } = equipmentData;

    const result = await this.pool.query(
      `
      INSERT INTO customer_equipment (
        customer_id, location_id, equipment_type, brand, model, serial_number,
        install_date, warranty_expiry, service_interval_days, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      RETURNING *
      `,
      [
        customerId,
        locationId,
        equipmentType,
        brand,
        model,
        serialNumber,
        installDate,
        warrantyExpiry,
        serviceIntervalDays,
        notes,
      ]
    );

    return result.rows[0];
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async createUser(userData) {
    const {
      firstName,
      lastName,
      email,
      hashedPassword,
      role = "user",
    } = userData;

    const result = await this.pool.query(
      `
      INSERT INTO users (
        company_id, first_name, last_name, email, password_hash, role, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name, last_name, email, role, created_at
      `,
      [
        "550e8400-e29b-41d4-a716-446655440000", // Default company ID
        firstName,
        lastName,
        email,
        hashedPassword,
        role,
        true,
      ]
    );

    return result.rows[0];
  }

  async getUserByEmail(email) {
    const result = await this.pool.query(
      `
      SELECT id, first_name, last_name, email, password_hash, role, is_active
      FROM users 
      WHERE email = $1 AND is_active = TRUE
      `,
      [email]
    );

    return result.rows[0] || null;
  }

  async getUserById(userId) {
    const result = await this.pool.query(
      `
      SELECT id, first_name, last_name, email, role, created_at, is_active
      FROM users 
      WHERE id = $1 AND is_active = TRUE
      `,
      [userId]
    );

    return result.rows[0] || null;
  }

  // ============================================================================
  // ROUTE CACHE OPERATIONS
  // ============================================================================

  async getRouteCache(routeKey) {
    const result = await this.pool.query(
      `
      SELECT route_data, distance_matrix 
      FROM route_cache 
      WHERE route_key = $1 AND expires_at > NOW()
      `,
      [routeKey]
    );

    return result.rows[0] || null;
  }

  async setRouteCache(routeKey, routeData, distanceMatrix = null) {
    await this.pool.query(
      `
      INSERT INTO route_cache (route_key, route_data, distance_matrix)
      VALUES ($1, $2, $3)
      ON CONFLICT (route_key) 
      DO UPDATE SET 
        route_data = $2,
        distance_matrix = $3,
        created_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
      `,
      [routeKey, JSON.stringify(routeData), JSON.stringify(distanceMatrix)]
    );
  }

  async clearExpiredRouteCache() {
    const result = await this.pool.query(
      `DELETE FROM route_cache WHERE expires_at <= NOW()`
    );
    return result.rowCount;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async testConnection() {
    try {
      const result = await this.pool.query("SELECT NOW() as current_time");
      return result.rows[0];
    } catch (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log("📴 Database connection closed");
    }
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
