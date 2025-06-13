import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import databaseService from "./databaseService.js";

class AuthService {
  constructor() {
    this.jwtSecret =
      process.env.JWT_SECRET || "super-secret-key-change-in-production";
    this.jwtExpiry = "24h";
  }

  // Hash password securely
  async hashPassword(password) {
    const saltRounds = 12; // Higher = more secure but slower
    return bcrypt.hash(password, saltRounds);
  }

  // Check if password matches hash
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Create JWT token
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      issuer: "field-service-platform",
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      } else {
        throw new Error("Token verification failed");
      }
    }
  }

  // Register new user
  async register(userData) {
    const {
      email,
      password,
      firstName,
      lastName,
      role = "technician",
    } = userData;

    try {
      // Check if user already exists
      const existingUser = await databaseService.getUserByEmail(email);
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user in database
      const newUser = await databaseService.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
        role,
      });

      // Generate token
      const token = this.generateToken(newUser);

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
        },
        token,
      };
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Get user from database
      const user = await databaseService.getUserByEmail(email);
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      // Generate token
      const token = this.generateToken(user);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        token,
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await databaseService.getUserById(userId);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      };
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  }
}

export default new AuthService();
