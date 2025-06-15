import { asyncHandler } from "../middleware/error-middleware.js";
import customerService from "../services/customer-service.js";
import { HTTP_STATUS } from "../config/constants.js";

export const customerController = {
  // GET /api/customers
  getCustomers: asyncHandler(async (req, res) => {
    const filters = {
      search: req.query.search,
      customerType: req.query.customerType,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };

    const result = await customerService.getCustomers(filters);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      customers: result.customers,
      total: result.total,
    });
  }),

  // GET /api/customers/:id
  getCustomer: asyncHandler(async (req, res) => {
    const customer = await customerService.getCustomerById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      customer: customer,
    });
  }),

  // POST /api/customers
  createCustomer: asyncHandler(async (req, res) => {
    const customer = await customerService.createCustomer(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Customer created successfully",
      customer: customer,
    });
  }),

  // PUT /api/customers/:id
  updateCustomer: asyncHandler(async (req, res) => {
    const customer = await customerService.updateCustomer(
      req.params.id,
      req.body
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Customer updated successfully",
      customer: customer,
    });
  }),

  // DELETE /api/customers/:id
  deleteCustomer: asyncHandler(async (req, res) => {
    await customerService.deleteCustomer(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Customer deleted successfully",
    });
  }),
};
