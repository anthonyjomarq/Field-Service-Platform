import { asyncHandler } from "../middleware/error-middleware.js";
import routeService from "../services/route-service.js";
import { HTTP_STATUS } from "../config/constants.js";

export const routeController = {
  // GET /api/routes/customers
  getRouteCustomers: asyncHandler(async (req, res) => {
    const filters = {
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };

    const result = await routeService.getCustomersForRoutes(filters);

    res.status(HTTP_STATUS.OK).json({
      customers: result.customers,
      total: result.total,
    });
  }),

  // POST /api/routes/optimize
  optimizeRoute: asyncHandler(async (req, res) => {
    const optimizedRoute = await routeService.optimizeRoute(req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      route: optimizedRoute,
    });
  }),

  // GET /api/routes/history
  getRouteHistory: asyncHandler(async (req, res) => {
    const history = await routeService.getRouteHistory();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      routes: history,
    });
  }),
};
