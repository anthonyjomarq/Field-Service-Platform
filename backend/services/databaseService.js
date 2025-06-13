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

  // ============================================================================
  // CUSTOMER OPERATIONS (Enhanced with spatial support)
  // ============================================================================

  async createCustomer(customerData, userId) {
    const {
      name,
      email,
      phone,
      customerType,
      businessType,
      locations = [],
    } = customerData;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Insert customer
      const customerResult = await client.query(
        `
        INSERT INTO customers (company_id, name, email, phone, customer_type, business_type, created_by, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          "550e8400-e29b-41d4-a716-446655440000", // Default company ID
          name,
          email,
          phone,
          customerType,
          businessType,
          userId,
          true,
        ]
      );

      const customer = customerResult.rows[0];

      // Insert locations if provided
      for (const location of locations) {
        await this.createCustomerLocation(customer.id, location, client);
      }

      await client.query("COMMIT");
      return await this.getCustomerById(customer.id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

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

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getCustomerById(customerId) {
    // Get customer
    const customerResult = await this.pool.query(
      `
      SELECT c.*, u.first_name as created_by_name, u.last_name as created_by_lastname
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1 AND c.is_active = TRUE
      `,
      [customerId]
    );

    if (customerResult.rows.length === 0) return null;

    const customer = customerResult.rows[0];

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
    };
  }

  async updateCustomer(customerId, customerData) {
    const { name, email, phone, customerType, businessType } = customerData;

    const result = await this.pool.query(
      `
      UPDATE customers 
      SET name = $1, email = $2, phone = $3, customer_type = $4, business_type = $5, updated_at = NOW()
      WHERE id = $6 AND is_active = TRUE
      RETURNING *
      `,
      [name, email, phone, customerType, businessType, customerId]
    );

    if (result.rows.length === 0) return null;
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
        FROM customers c
        JOIN customer_locations cl ON c.id = cl.customer_id
        WHERE cl.geom IS NOT NULL 
          AND cl.is_active = TRUE 
          AND c.is_active = TRUE
        ORDER BY c.name ASC
      `;
      const result = await this.pool.query(query);
      return result.rows;
    } else {
      // Get specific customers
      const query = `
        SELECT c.name as customer_name, cl.*,
               ST_X(cl.geom) as longitude,
               ST_Y(cl.geom) as latitude
        FROM customers c
        JOIN customer_locations cl ON c.id = cl.customer_id
        WHERE c.id = ANY($1)
          AND cl.geom IS NOT NULL 
          AND cl.is_active = TRUE 
          AND c.is_active = TRUE
        ORDER BY c.name ASC
      `;
      const result = await this.pool.query(query, [customerIds]);
      return result.rows;
    }
  }

  async calculateDistanceMatrix(locationIds) {
    const query = `
      SELECT 
        a.id as origin_id,
        b.id as destination_id,
        ST_Distance(a.geom::geography, b.geom::geography) / 1000 as distance_km,
        a.customer_id as origin_customer_id,
        b.customer_id as destination_customer_id
      FROM customer_locations a
      CROSS JOIN customer_locations b
      WHERE a.id = ANY($1) AND b.id = ANY($1)
        AND a.geom IS NOT NULL AND b.geom IS NOT NULL
      ORDER BY a.id, b.id
    `;

    const result = await this.pool.query(query, [locationIds]);
    return result.rows;
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async createUser(userData) {
    const { email, passwordHash, firstName, lastName, role } = userData;

    const result = await this.pool.query(
      `
      INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, company_id, email, first_name, last_name, role, is_active, created_at
      `,
      [
        "550e8400-e29b-41d4-a716-446655440000",
        email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role || "technician",
      ]
    );

    return result.rows[0];
  }

  async getUserByEmail(email) {
    const result = await this.pool.query(
      `
      SELECT u.*, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = $1 AND u.is_active = TRUE
      `,
      [email.toLowerCase()]
    );

    return result.rows[0] || null;
  }

  async getUserById(userId) {
    const result = await this.pool.query(
      `
      SELECT u.*, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = $1 AND u.is_active = TRUE
      `,
      [userId]
    );

    return result.rows[0] || null;
  }

  async getUsers(companyId = "550e8400-e29b-41d4-a716-446655440000") {
    const result = await this.pool.query(
      `
      SELECT id, company_id, email, first_name, last_name, role, is_active, last_login, created_at
      FROM users 
      WHERE company_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
      `,
      [companyId]
    );

    return result.rows;
  }

  async updateUserLastLogin(userId) {
    await this.pool.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [
      userId,
    ]);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getTableCounts() {
    const result = await this.pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE is_active = TRUE) as customers,
        (SELECT COUNT(*) FROM customer_locations WHERE is_active = TRUE) as locations,
        (SELECT COUNT(*) FROM customer_locations WHERE geom IS NOT NULL AND is_active = TRUE) as geocoded_locations,
        (SELECT COUNT(*) FROM customer_equipment) as equipment,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as users
    `);

    return result.rows[0];
  }

  async healthCheck() {
    try {
      const client = await this.pool.connect();

      // Test basic query
      await client.query("SELECT NOW()");

      // Test PostGIS
      const postgisResult = await client.query("SELECT PostGIS_Version()");

      // Get table counts
      const counts = await this.getTableCounts();

      client.release();

      return {
        status: "healthy",
        postgis: postgisResult.rows[0].postgis_version,
        tables: counts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default new DatabaseService();
