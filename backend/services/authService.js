import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AuthService {
  constructor() {
    this.usersFile = path.join(__dirname, "../data/users.json");
    this.jwtSecret =
      process.env.JWT_SECRET || "super-secret-key-change-in-production";
    this.jwtExpiry = "24h";
  }

  // Read users from JSON file
  async getUsers() {
    try {
      const data = await fs.readFile(this.usersFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.log("No users file found, creating new one");
      await fs.writeFile(this.usersFile, "[]");
      return [];
    }
  }

  // Save users to JSON file
  async saveUsers(users) {
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
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
      firstName: user.firstName,
      lastName: user.lastName,
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
      // Get existing users
      const users = await this.getUsers();

      // Check if user already exists
      const existingUser = users.find(
        (user) => user.email.toLowerCase() === email.toLowerCase()
      );
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create new user
      const hashedPassword = await this.hashPassword(password);
      const newUser = {
        id: Date.now().toString(), // Simple ID for now
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Add to users array
      users.push(newUser);
      await this.saveUsers(users);

      // Generate token
      const token = this.generateToken(newUser);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = newUser;

      return {
        success: true,
        user: userWithoutPassword,
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
      // Get users
      const users = await this.getUsers();

      // Find user by email
      const user = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.isActive
      );
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        password,
        user.password
      );
      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      // Generate token
      const token = this.generateToken(user);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
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
      const users = await this.getUsers();
      const user = users.find((u) => u.id === userId && u.isActive);

      if (!user) {
        return null;
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  }
}

export default new AuthService();
