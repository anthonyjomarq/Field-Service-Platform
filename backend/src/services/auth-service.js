import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "../config/constants.js";
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../utils/errors.js";
import userService from "./user-service.js";
import { logger } from "../utils/logger.js";

class AuthService {
  async register(userData) {
    const {
      firstName,
      lastName,
      email,
      password,
      role = "technician",
      companyId,
    } = userData;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      throw new ValidationError("All fields are required");
    }

    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters long");
    }

    // For now, use a default company ID if not provided
    const defaultCompanyId =
      companyId || "11111111-1111-1111-1111-111111111111";

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await userService.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      companyId: defaultCompanyId,
    });

    // Generate token
    const token = this.generateToken(user.id);

    logger.info(`User registered: ${email}`);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(email, password) {
    // Validation
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    // Get user by email
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check password (handle both password_hash and password fields)
    const passwordField = user.password_hash || user.password;
    const isPasswordValid = await bcrypt.compare(password, passwordField);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Update last login
    await userService.updateLastLogin(user.id);

    // Generate token
    const token = this.generateToken(user.id);

    logger.info(`User logged in: ${email}`);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async getUserProfile(userId) {
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    return this.sanitizeUser(user);
  }

  async logout(userId) {
    // In a more advanced setup, we might:
    // - Blacklist the token
    // - Update last_logout timestamp
    // - Clear refresh tokens

    logger.info(`User logged out: ${userId}`);
    return true;
  }

  async getAllUsers() {
    const users = await userService.getAllUsers();
    return users.map((user) => this.sanitizeUser(user));
  }

  generateToken(userId) {
    return jwt.sign({ id: userId }, JWT_CONFIG.SECRET, {
      expiresIn: JWT_CONFIG.EXPIRES_IN,
    });
  }

  sanitizeUser(user) {
    // Remove sensitive fields and normalize field names
    const { password, password_hash, ...sanitizedUser } = user;

    // Normalize field names for frontend compatibility
    return {
      id: sanitizedUser.id,
      firstName: sanitizedUser.first_name || sanitizedUser.firstName,
      lastName: sanitizedUser.last_name || sanitizedUser.lastName,
      email: sanitizedUser.email,
      role: sanitizedUser.role,
      companyId: sanitizedUser.company_id,
      isActive: sanitizedUser.is_active,
      lastLogin: sanitizedUser.last_login,
      createdAt: sanitizedUser.created_at,
      updatedAt: sanitizedUser.updated_at,
    };
  }
}

export default new AuthService();
