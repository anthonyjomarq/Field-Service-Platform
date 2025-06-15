import { Router } from "express";
import { customerController } from "../controllers/customer-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import {
  validateRequest,
  validateParams,
} from "../middleware/validation-middleware.js";
import { customerValidationSchemas } from "../utils/validators.js";

const router = Router();

// Apply authentication to all customer routes
router.use(authenticate);

// GET /api/customers
router.get("/", customerController.getCustomers);

// GET /api/customers/:id
router.get(
  "/:id",
  validateParams(customerValidationSchemas.id),
  customerController.getCustomer
);

// POST /api/customers
router.post(
  "/",
  validateRequest(customerValidationSchemas.create),
  customerController.createCustomer
);

// PUT /api/customers/:id
router.put(
  "/:id",
  validateParams(customerValidationSchemas.id),
  validateRequest(customerValidationSchemas.update),
  customerController.updateCustomer
);

// DELETE /api/customers/:id
router.delete(
  "/:id",
  validateParams(customerValidationSchemas.id),
  customerController.deleteCustomer
);

export default router;
