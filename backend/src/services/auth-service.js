import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "../config/constants.js";
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../utils/errors.js";
import userService from "./user-service.js";
import databaseService from "./database-service.js";
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

    // Use provided company ID or default
    const targetCompanyId = companyId || "11111111-1111-1111-1111-111111111111";

    try {
      // Verify the company exists BEFORE trying to create the user
      const companyExists = await this.verifyCompanyExists(targetCompanyId);
      if (!companyExists) {
        // If default company doesn't exist, create it
        if (targetCompanyId === "11111111-1111-1111-1111-111111111111") {
          await this.createDefaultCompany();
          logger.info("Created default company");
        } else {
          throw new ValidationError(
            `Company with ID ${targetCompanyId} does not exist`
          );
        }
      }

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
        companyId: targetCompanyId,
      });

      // Generate token
      const token = this.generateToken(user.id);

      logger.info(`User registered successfully: ${email}`);

      return {
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      logger.error(`Registration failed for ${email}:`, error.message);

      // Handle specific database errors
      if (error.message && error.message.includes("foreign key constraint")) {
        throw new ValidationError(
          "Invalid company ID provided. Please contact administrator."
        );
      }

      throw error;
    }
  }

  async verifyCompanyExists(companyId) {
    try {
      const query = "SELECT id FROM companies WHERE id = $1";
      const result = await databaseService.get(query, [companyId]);
      return !!result;
    } catch (error) {
      logger.error("Error checking company existence:", error);
      return false;
    }
  }

  async createDefaultCompany() {
    try {
      const query = `
        INSERT INTO companies (id, name, created_at) 
        VALUES ($1, $2, NOW()) 
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;

      await databaseService.get(query, [
        "11111111-1111-1111-1111-111111111111",
        "Field Service Solutions Inc.",
      ]);

      return true;
    } catch (error) {
      logger.error("Error creating default company:", error);
      throw new ValidationError("Failed to initialize default company");
    }
  }

  async login(email, password) {
    // Validation
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    try {
      // Get user by email
      const user = await userService.getUserByEmail(email);
      if (!user) {
        logger.warn(`Login attempt with non-existent email: ${email}`);
        throw new AuthenticationError("Invalid email or password");
      }

      // Check if user is active
      if (!user.is_active) {
        logger.warn(`Login attempt for inactive user: ${email}`);
        throw new AuthenticationError("Account is deactivated");
      }

      // Check password (handle both password_hash and password fields)
      const passwordField = user.password_hash || user.password;
      const isPasswordValid = await bcrypt.compare(password, passwordField);

      if (!isPasswordValid) {
        logger.warn(`Invalid password attempt for user: ${email}`);
        throw new AuthenticationError("Invalid email or password");
      }

      // Update last login
      await userService.updateLastLogin(user.id);

      // Generate token
      const token = this.generateToken(user.id);

      logger.info(`User logged in successfully: ${email}`);

      return {
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      // Log the specific error but don't expose details to client
      if (!(error instanceof AuthenticationError)) {
        logger.error(`Login error for ${email}:`, error);
        throw new AuthenticationError("Invalid email or password");
      }
      throw error;
    }
  }

  // ... rest of the methods remain the same
  async getUserProfile(userId) {
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new AuthenticationError("User not found");
    }
    return this.sanitizeUser(user);
  }

  async logout(userId) {
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
    const { password, password_hash, ...sanitizedUser } = user;
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
