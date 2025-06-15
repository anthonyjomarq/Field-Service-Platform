import jwt from "jsonwebtoken";
import { JWT_CONFIG, USER_ROLES } from "../config/constants.js";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";
import { asyncHandler } from "./error-middleware.js";
import userService from "../services/user-service.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AuthenticationError("Access token required");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET);

    // Get user and attach to request
    const user = await userService.getUserById(decoded.id);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Token expired");
    }
    throw new AuthenticationError("Invalid token");
  }
});

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError("Access token required");
    }

    if (roles.length && !roles.includes(req.user.role)) {
      throw new AuthorizationError("Insufficient permissions");
    }

    next();
  };
};
