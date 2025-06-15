import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Middleware imports
import { errorHandler } from "./middleware/error-middleware.js";
import { requestLogger } from "./middleware/logger-middleware.js";
import { rateLimiter } from "./middleware/rateLimiter-middleware.js";

// Route imports
import authRoutes from "./routes/auth-routes.js";
import customerRoutes from "./routes/customer-routes.js";
import routeRoutes from "./routes/route-routes.js";
import healthRoutes from "./routes/health-routes.js";

// Load environment variables
dotenv.config();

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger); // Log all requests
app.use(rateLimiter); // Rate limiting

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Field Service Platform API",
    status: "running",
    version: "2.0.0",
    features: {
      authentication: "✅ Available",
      userRegistration: "✅ Available",
      userLogin: "✅ Available",
      protectedRoutes: "✅ Available",
    },
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      profile: "GET /api/auth/profile (requires token)",
      users: "GET /api/auth/users (admin only)",
    },
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/health", healthRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
