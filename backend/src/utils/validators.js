import Joi from "joi";

export const authValidationSchemas = {
  register: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid("user", "admin", "manager").default("user"),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const customerValidationSchemas = {
  id: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).max(20).allow("", null),
    business_type: Joi.string()
      .valid("residential", "commercial", "industrial")
      .default("residential"),
    locations: Joi.array()
      .items(
        Joi.object({
          address: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          zip_code: Joi.string().required(),
          latitude: Joi.number().allow(null),
          longitude: Joi.number().allow(null),
          is_primary: Joi.boolean().default(false),
          access_notes: Joi.string().allow("", null),
        })
      )
      .default([]),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    phone: Joi.string().min(10).max(20).allow("", null),
    business_type: Joi.string().valid(
      "residential",
      "commercial",
      "industrial"
    ),
  }),
};

export const routeValidationSchemas = {
  optimize: Joi.object({
    origin: Joi.string().required(),
    customerIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
    routeName: Joi.string().max(100).allow("", null),
    scheduledDate: Joi.string().isoDate().allow("", null),
  }),
};

export default {
  authValidationSchemas,
  customerValidationSchemas,
  routeValidationSchemas,
};
