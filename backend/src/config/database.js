import dotenv from "dotenv";

dotenv.config();

export const databaseConfig = {
  // PostgreSQL configuration
  postgres: {
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "field_service",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  },

  // Connection pool settings
  pool: {
    min: 2,
    max: 20,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
  },
};

export default databaseConfig;
