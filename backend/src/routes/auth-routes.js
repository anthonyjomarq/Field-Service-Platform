import { Router } from "express";
import { authController } from "../controllers/auth-controller.js";
import { authenticate, authorize } from "../middleware/auth-middleware.js";
import { authRateLimiter } from "../middleware/rateLimiter-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { authValidationSchemas } from "../utils/validators.js";

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimiter);

// Public routes
router.post(
  "/register",
  validateRequest(authValidationSchemas.register),
  authController.register
);

router.post(
  "/login",
  validateRequest(authValidationSchemas.login),
  authController.login
);

// Protected routes
router.get("/profile", authenticate, authController.getProfile);
router.post("/logout", authenticate, authController.logout);

// Admin only routes
router.get(
  "/users",
  authenticate,
  authorize(["admin"]),
  authController.getUsers
);

export default router;
