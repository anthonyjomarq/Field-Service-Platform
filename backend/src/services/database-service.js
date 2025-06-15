import pkg from "pg";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";
import { databaseConfig } from "../config/database.js";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    try {
      this.pool = new Pool({
        ...databaseConfig.postgres,
        ...databaseConfig.pool,
      });

      // Test connection
      const client = await this.pool.connect();
      logger.info("✅ PostgreSQL connected successfully");

      // Test PostGIS
      try {
        const postgisTest = await client.query("SELECT PostGIS_Version();");
        logger.info(
          "✅ PostGIS available:",
          postgisTest.rows[0].postgis_version
        );
      } catch (error) {
        logger.warn("⚠️ PostGIS not available - spatial features disabled");
      }

      client.release();

      // Create/verify tables
      await this.createTables();

      return this.pool;
    } catch (error) {
      logger.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  async createTables() {
    try {
      const schemaPath = path.join(__dirname, "../../database/schema.sql");
      const schema = await fs.readFile(schemaPath, "utf8");

      await this.pool.query(schema);
      logger.info("✅ Database tables created/verified");

      // Ensure contact_info column exists for multiple contacts support
      await this.ensureContactInfoColumn();

      // Run initial data if needed
      try {
        const initPath = path.join(__dirname, "../../database/init.sql");
        const initData = await fs.readFile(initPath, "utf8");
        await this.pool.query(initData);
        logger.info("✅ Initial data loaded");
      } catch (error) {
        logger.info("ℹ️ Initial data already exists or skipped");
      }
    } catch (error) {
      logger.error("❌ Error creating tables:", error);
      throw error;
    }
  }

  // Ensure contact_info column exists for multiple emails/phones support
  async ensureContactInfoColumn() {
    try {
      // Add contact_info column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '[]'::jsonb
      `);
      logger.info("✅ Contact info column ensured");
    } catch (error) {
      logger.warn("⚠️ Contact info column update skipped:", error.message);
    }
  }

  // Query methods for PostgreSQL
  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.warn("Slow query detected:", { text, duration, params });
      }

      return result;
    } catch (error) {
      logger.error("Database query error:", {
        text,
        params,
        error: error.message,
      });
      throw error;
    }
  }

  // Get single row
  async get(text, params = []) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  }

  // Get all rows
  async all(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  }

  // Execute query (for INSERT/UPDATE/DELETE)
  async run(text, params = []) {
    const result = await this.query(text, params);
    return {
      rowCount: result.rowCount,
      lastID: result.rows[0]?.id, // For RETURNING id queries
      rows: result.rows,
    };
  }

  // Transaction support
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Spatial queries for PostGIS
  async findNearbyLocations(longitude, latitude, radiusKm = 10, limit = 50) {
    const query = `
      SELECT 
        cl.*,
        c.name as customer_name,
        c.customer_type,
        ST_Distance(
          ST_Transform(geom, 3857), 
          ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857)
        ) / 1000 as distance_km
      FROM customer_locations cl
      JOIN customers c ON cl.customer_id = c.id
      WHERE cl.geom IS NOT NULL 
        AND cl.is_active = TRUE
        AND c.is_active = TRUE
        AND ST_DWithin(
          ST_Transform(geom, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
          $3 * 1000
        )
      ORDER BY cl.geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT $4
    `;

    return await this.all(query, [longitude, latitude, radiusKm, limit]);
  }

  // Get customers with their locations (optimized for route planning)
  async getCustomersWithLocations(filters = {}) {
    let query = `
      SELECT 
        c.*,
        json_agg(
          json_build_object(
            'id', cl.id,
            'address_type', cl.address_type,
            'street_address', cl.street_address,
            'address_line_2', cl.address_line_2,
            'city', cl.city,
            'state', cl.state,
            'postal_code', cl.postal_code,
            'latitude', cl.latitude,
            'longitude', cl.longitude,
            'formatted_address', cl.formatted_address,
            'access_notes', cl.access_notes,
            'is_primary', cl.is_primary,
            'is_active', cl.is_active
          ) ORDER BY cl.is_primary DESC, cl.created_at ASC
        ) FILTER (WHERE cl.id IS NOT NULL) as locations
      FROM customers c
      LEFT JOIN customer_locations cl ON c.id = cl.customer_id 
        AND cl.is_active = TRUE
      WHERE c.is_active = TRUE
    `;

    const params = [];
    let paramCount = 0;

    // Apply filters
    if (filters.search) {
      paramCount++;
      query += ` AND (c.name ILIKE ${paramCount} OR c.email ILIKE ${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.customerType) {
      paramCount++;
      query += ` AND c.customer_type = ${paramCount}`;
      params.push(filters.customerType);
    }

    query += ` GROUP BY c.id ORDER BY c.name ASC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT ${paramCount}`;
      params.push(filters.limit);
    }

    return await this.all(query, params);
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info("Database connection pool closed");
    }
  }
}

export default new DatabaseService();
