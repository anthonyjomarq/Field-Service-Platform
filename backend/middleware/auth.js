import authService from "../services/authService.js";

// Middleware to verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. No token provided.",
        hint: "Include Authorization: Bearer <token> in your request headers",
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = authService.verifyToken(token);

    // Get full user info
    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: "Access denied. User not found.",
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      error: "Access denied. Invalid token.",
      details: error.message,
    });
  }
};

// Middleware to check user roles
export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied. Insufficient permissions.",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};
