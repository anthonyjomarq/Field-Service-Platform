import databaseService from "../services/database-service.js";
import { logger } from "../utils/logger.js";

class UserModel {
  async create(userData) {
    const {
      firstName,
      lastName,
      email,
      password,
      role = "technician",
      companyId,
    } = userData;

    const query = `
      INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    try {
      const result = await databaseService.get(query, [
        companyId,
        email,
        password,
        firstName,
        lastName,
        role,
      ]);
      return result;
    } catch (error) {
      logger.error("Error creating user:", error);
      throw error;
    }
  }

  async findById(userId) {
    const query = "SELECT * FROM users WHERE id = $1 AND is_active = TRUE";

    try {
      return await databaseService.get(query, [userId]);
    } catch (error) {
      logger.error("Error finding user by ID:", error);
      throw error;
    }
  }

  async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1 AND is_active = TRUE";

    try {
      return await databaseService.get(query, [email]);
    } catch (error) {
      logger.error("Error finding user by email:", error);
      throw error;
    }
  }

  async findAll(companyId = null) {
    let query = `
      SELECT id, company_id, email, first_name, last_name, role, is_active, last_login, created_at 
      FROM users 
      WHERE is_active = TRUE
    `;
    const params = [];

    if (companyId) {
      query += " AND company_id = $1";
      params.push(companyId);
    }

    query += " ORDER BY created_at DESC";

    try {
      return await databaseService.all(query, params);
    } catch (error) {
      logger.error("Error finding all users:", error);
      throw error;
    }
  }

  async update(userId, userData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic update query
    Object.keys(userData).forEach((key) => {
      if (userData[key] !== undefined) {
        paramCount++;
        fields.push(`${key} = ${paramCount}`);
        values.push(userData[key]);
      }
    });

    if (fields.length === 0) {
      return this.findById(userId);
    }

    // Add updated_at
    paramCount++;
    fields.push(`updated_at = ${paramCount}`);
    values.push(new Date());

    // Add userId for WHERE clause
    paramCount++;
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(
      ", "
    )} WHERE id = ${paramCount} RETURNING *`;

    try {
      return await databaseService.get(query, values);
    } catch (error) {
      logger.error("Error updating user:", error);
      throw error;
    }
  }

  async delete(userId) {
    // Soft delete - set is_active to false
    const query =
      "UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1";

    try {
      await databaseService.run(query, [userId]);
    } catch (error) {
      logger.error("Error deleting user:", error);
      throw error;
    }
  }

  async updateLastLogin(userId) {
    const query = "UPDATE users SET last_login = NOW() WHERE id = $1";

    try {
      await databaseService.run(query, [userId]);
    } catch (error) {
      logger.error("Error updating last login:", error);
      throw error;
    }
  }
}

export default new UserModel();
