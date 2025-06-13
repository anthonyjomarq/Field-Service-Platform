import express from "express";
import authService from "../services/authService.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: "Email, password, firstName, and lastName are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address",
      });
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({
      error: error.message || "Registration failed",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({
      error: error.message || "Login failed",
    });
  }
});

// Get current user profile (protected route)
router.get("/profile", authenticate, (req, res) => {
  res.json({
    user: req.user,
    message: "Profile retrieved successfully",
  });
});

// Logout (mainly for logging purposes - JWT is stateless)
router.post("/logout", authenticate, (req, res) => {
  // Log the logout for security auditing
  console.log(`User ${req.user.email} logged out at ${new Date()}`);

  res.json({
    message: "Logged out successfully",
    hint: "Remove the JWT token from your client storage",
  });
});

// Get all users (admin only)
router.get("/users", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    const users = await authService.getUsers();
    // Remove passwords from response
    const safeUsers = users.map(({ password, ...user }) => user);

    res.json({
      users: safeUsers,
      total: safeUsers.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve users",
    });
  }
});

export default router;
