import app from "./app.js";
import databaseService from "./services/database-service.js";
import { logger } from "./utils/logger.js";

const PORT = process.env.PORT || 3000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    await databaseService.initialize();
    logger.info("Database initialized successfully");

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`🔐 Authentication endpoints ready:`);
      logger.info(
        `   📝 Register: POST http://localhost:${PORT}/api/auth/register`
      );
      logger.info(`   🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
      logger.info(
        `   👤 Profile: GET http://localhost:${PORT}/api/auth/profile`
      );
      logger.info(
        `   🛡️  Protected: GET http://localhost:${PORT}/api/protected`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await databaseService.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await databaseService.close();
  process.exit(0);
});

startServer();
