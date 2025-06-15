import { Router } from "express";
import { routeController } from "../controllers/route-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { validateRequest } from "../middleware/validation-middleware.js";
import { routeValidationSchemas } from "../utils/validators.js";

const router = Router();

// Apply authentication to all route endpoints
router.use(authenticate);

// GET /api/routes/customers
router.get("/customers", routeController.getRouteCustomers);

// POST /api/routes/optimize
router.post(
  "/optimize",
  validateRequest(routeValidationSchemas.optimize),
  routeController.optimizeRoute
);

// GET /api/routes/history
router.get("/history", routeController.getRouteHistory);

export default router;
