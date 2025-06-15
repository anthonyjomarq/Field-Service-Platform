import { Router } from "express";
import { asyncHandler } from "../middleware/error-middleware.js";
import databaseService from "../services/database-service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Check database connection
    let dbStatus = "disconnected";
    try {
      await databaseService.get("SELECT 1");
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "error";
    }

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbStatus,
      services: {
        authentication: "ready",
        customers: "ready",
        routes: "ready",
      },
    });
  })
);

export default router;
