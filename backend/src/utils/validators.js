import Joi from "joi";

export const authValidationSchemas = {
  register: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    // FIXED: Updated to match database schema roles
    role: Joi.string()
      .valid("admin", "dispatcher", "technician", "customer")
      .default("technician"),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const customerValidationSchemas = {
  id: Joi.object({
    id: Joi.string().uuid().required(), // Changed from number to UUID to match schema
  }),

  create: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().allow("", null),
    phone: Joi.string().min(10).max(20).allow("", null),
    customer_type: Joi.string()
      .valid("residential", "commercial")
      .default("commercial"),
    business_type: Joi.string().max(100).allow("", null),
    locations: Joi.array()
      .items(
        Joi.object({
          street_address: Joi.string().required(),
          address_line_2: Joi.string().allow("", null),
          city: Joi.string().required(),
          state: Joi.string().allow("", null),
          postal_code: Joi.string().allow("", null),
          country: Joi.string().default("US"),
          latitude: Joi.number().allow(null),
          longitude: Joi.number().allow(null),
          is_primary: Joi.boolean().default(false),
          access_notes: Joi.string().allow("", null),
          contact_person: Joi.string().allow("", null),
          contact_phone: Joi.string().allow("", null),
          service_hours: Joi.string().allow("", null),
        })
      )
      .default([]),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(255),
    email: Joi.string().email().allow("", null),
    phone: Joi.string().min(10).max(20).allow("", null),
    customer_type: Joi.string().valid("residential", "commercial"),
    business_type: Joi.string().max(100).allow("", null),
  }),
};

export const routeValidationSchemas = {
  optimize: Joi.object({
    origin: Joi.string().required(),
    customerIds: Joi.array()
      .items(Joi.string().uuid()) // Changed to UUID
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
