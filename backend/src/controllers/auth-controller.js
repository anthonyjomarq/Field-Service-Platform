import { asyncHandler } from "../middleware/error-middleware.js";
import authService from "../services/auth-service.js";
import { HTTP_STATUS } from "../config/constants.js";

export const authController = {
  // POST /api/auth/register
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "User registered successfully",
      user: result.user,
      token: result.token,
    });
  }),

  // POST /api/auth/login
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Login successful",
      user: result.user,
      token: result.token,
    });
  }),

  // GET /api/auth/profile
  getProfile: asyncHandler(async (req, res) => {
    // req.user is set by authenticate middleware
    const user = await authService.getUserProfile(req.user.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      user: user,
    });
  }),

  // POST /api/auth/logout
  logout: asyncHandler(async (req, res) => {
    // In a more advanced setup, we might blacklist the token
    await authService.logout(req.user.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Logout successful",
    });
  }),

  // GET /api/auth/users (admin only)
  getUsers: asyncHandler(async (req, res) => {
    const users = await authService.getAllUsers();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      users: users,
    });
  }),
};
