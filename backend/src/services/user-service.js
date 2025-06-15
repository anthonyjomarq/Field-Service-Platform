import { NotFoundError } from "../utils/errors.js";
import userModel from "../models/User-model.js";
import { logger } from "../utils/logger.js";

class UserService {
  async createUser(userData) {
    return await userModel.create(userData);
  }

  async getUserById(userId) {
    return await userModel.findById(userId);
  }

  async getUserByEmail(email) {
    return await userModel.findByEmail(email);
  }

  async getAllUsers(companyId = null) {
    return await userModel.findAll(companyId);
  }

  async updateUser(userId, userData) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return await userModel.update(userId, userData);
  }

  async updateLastLogin(userId) {
    await userModel.updateLastLogin(userId);
  }

  async deleteUser(userId) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    await userModel.delete(userId);
    logger.info(`User deleted: ${user.email} (ID: ${userId})`);
  }
}

export default new UserService();
