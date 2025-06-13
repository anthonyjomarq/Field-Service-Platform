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

  // Customer operations
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
        INSERT INTO customers (company_id, name, email, phone, customer_type, business_type, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [
          "550e8400-e29b-41d4-a716-446655440000",
          name,
          email,
          phone,
          customerType,
          businessType,
          userId,
        ]
      );

      const customer = customerResult.rows[0];

      // Insert locations if provided
      for (const location of locations) {
        await client.query(
          `
          INSERT INTO customer_locations (customer_id, address, city, state, zip_code, access_notes, is_primary)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            customer.id,
            location.address,
            location.city,
            location.state,
            location.zipCode,
            location.accessNotes,
            location.isPrimary,
          ]
        );
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
      LEFT JOIN customer_locations cl ON c.id = cl.customer_id
      LEFT JOIN customer_equipment ce ON c.id = ce.customer_id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.company_id = $1
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
      WHERE c.id = $1
    `,
      [customerId]
    );

    if (customerResult.rows.length === 0) return null;

    const customer = customerResult.rows[0];

    // Get locations
    const locationsResult = await this.pool.query(
      `
      SELECT * FROM customer_locations WHERE customer_id = $1 ORDER BY is_primary DESC, created_at ASC
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
      WHERE id = $6
      RETURNING *
    `,
      [name, email, phone, customerType, businessType, customerId]
    );

    if (result.rows.length === 0) return null;
    return await this.getCustomerById(customerId);
  }

  async deleteCustomer(customerId) {
    const result = await this.pool.query(
      "DELETE FROM customers WHERE id = $1",
      [customerId]
    );
    return result.rowCount > 0;
  }

  // User operations for database
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
        role,
      ]
    );

    return result.rows[0];
  }

  async getUserById(userId) {
    const result = await this.pool.query(
      `
      SELECT id, company_id, email, first_name, last_name, role, is_active, created_at
      FROM users WHERE id = $1 AND is_active = TRUE
    `,
      [userId]
    );

    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    const result = await this.pool.query(
      `
      SELECT * FROM users WHERE email = $1 AND is_active = TRUE
    `,
      [email.toLowerCase()]
    );

    return result.rows[0] || null;
  }

  async getAllUsers(companyId = "550e8400-e29b-41d4-a716-446655440000") {
    const result = await this.pool.query(
      `
      SELECT id, email, first_name, last_name, role, created_at
      FROM users WHERE company_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
    `,
      [companyId]
    );

    return result.rows;
  }
}

export default new DatabaseService();
