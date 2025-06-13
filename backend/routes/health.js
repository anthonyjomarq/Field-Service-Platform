import express from "express";
import databaseService from "../services/databaseService.js";

const router = express.Router();

// Enhanced health check with PostGIS verification
router.get("/", async (req, res) => {
  try {
    // Test basic database connection
    const client = await databaseService.pool.connect();

    // Test PostGIS
    const postgisTest = await client.query("SELECT PostGIS_Version();");

    // Get table counts
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE is_active = TRUE) as customers,
        (SELECT COUNT(*) FROM customer_locations WHERE is_active = TRUE) as locations,
        (SELECT COUNT(*) FROM customer_locations WHERE geom IS NOT NULL AND is_active = TRUE) as geocoded_locations,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as users
    `);

    client.release();

    res.json({
      status: "healthy",
      postgis: postgisTest.rows[0].postgis_version,
      database: counts.rows[0],
      timestamp: new Date().toISOString(),
      features: {
        spatial_queries: "✅ Available",
        route_optimization: "✅ Ready",
        geocoding_support: "✅ Ready",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Test spatial operations
router.get("/spatial-test", async (req, res) => {
  try {
    const pool = databaseService.pool;

    // Test 1: Create a test point
    const testPoint = await pool.query(`
      SELECT ST_AsText(ST_SetSRID(ST_MakePoint(-66.1164, 18.4647), 4326)) as point_text,
             ST_X(ST_SetSRID(ST_MakePoint(-66.1164, 18.4647), 4326)) as longitude,
             ST_Y(ST_SetSRID(ST_MakePoint(-66.1164, 18.4647), 4326)) as latitude
    `);

    // Test 2: Calculate distance between two Puerto Rico points
    const distanceTest = await pool.query(`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(-66.1164, 18.4647), 4326)::geography,
        ST_SetSRID(ST_MakePoint(-66.1175, 18.4651), 4326)::geography
      ) / 1000 as distance_km
    `);

    // Test 3: Check actual customer locations with spatial data
    const locationCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_locations,
        COUNT(CASE WHEN geom IS NOT NULL THEN 1 END) as geocoded_locations,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as coordinate_locations
      FROM customer_locations
      WHERE is_active = TRUE
    `);

    // Test 4: Get sample customer location with spatial data
    const sampleLocation = await pool.query(`
      SELECT 
        c.name as customer_name,
        cl.street_address,
        cl.city,
        cl.latitude,
        cl.longitude,
        ST_AsText(cl.geom) as geometry_text
      FROM customers c
      JOIN customer_locations cl ON c.id = cl.customer_id
      WHERE cl.geom IS NOT NULL AND c.is_active = TRUE AND cl.is_active = TRUE
      LIMIT 1
    `);

    res.json({
      status: "✅ PostGIS working correctly",
      tests: {
        point_creation: {
          text: testPoint.rows[0].point_text,
          coordinates: {
            latitude: testPoint.rows[0].latitude,
            longitude: testPoint.rows[0].longitude,
          },
        },
        distance_calculation: {
          distance_km: parseFloat(distanceTest.rows[0].distance_km).toFixed(3),
          note: "Distance between two points in Old San Juan, Puerto Rico",
        },
        location_data: locationCheck.rows[0],
        sample_customer:
          sampleLocation.rows[0] || "No geocoded customers found",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "❌ PostGIS test failed",
      error: error.message,
      suggestion: "Check if PostGIS extension is properly enabled",
    });
  }
});

export default router;
