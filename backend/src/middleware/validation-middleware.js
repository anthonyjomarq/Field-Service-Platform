import { ValidationError } from "../utils/errors.js";

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      throw new ValidationError(message);
    }
    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      throw new ValidationError(message);
    }
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      throw new ValidationError(message);
    }
    next();
  };
};
