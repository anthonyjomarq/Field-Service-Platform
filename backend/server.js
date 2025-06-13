import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { authenticate, authorize } from "./middleware/auth.js";
import databaseService from "./services/databaseService.js";
import customerRoutes from "./routes/customers.js";

// Load environment variables
dotenv.config();

// Initialize database before starting server
databaseService.initialize().catch(console.error);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
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

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    authentication: "ready",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Protected test route
app.get("/api/protected", authenticate, (req, res) => {
  res.json({
    message: `Hello ${req.user.firstName}! This is a protected route.`,
    user: req.user,
    accessTime: new Date().toISOString(),
  });
});

// Admin-only test route
app.get("/api/admin-only", authenticate, authorize(["admin"]), (req, res) => {
  res.json({
    message: "Welcome to the admin area!",
    user: req.user,
    secret: "Only admins can see this data",
  });
});

app.use("/api/customers", customerRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔐 Authentication endpoints ready:`);
  console.log(
    `   📝 Register: POST http://localhost:${PORT}/api/auth/register`
  );
  console.log(`   🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   👤 Profile: GET http://localhost:${PORT}/api/auth/profile`);
  console.log(`   🛡️  Protected: GET http://localhost:${PORT}/api/protected`);
});
