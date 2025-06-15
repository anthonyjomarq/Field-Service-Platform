export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  MANAGER: "manager",
};

export const CUSTOMER_TYPES = {
  RESIDENTIAL: "residential",
  COMMERCIAL: "commercial",
  INDUSTRIAL: "industrial",
};

export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || "your-secret-key",
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
};

export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs
};

export default {
  HTTP_STATUS,
  USER_ROLES,
  CUSTOMER_TYPES,
  JWT_CONFIG,
  RATE_LIMIT,
};
