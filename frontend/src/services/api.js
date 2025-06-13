import axios from "axios";

// Base URL for Express API
const API_BASE_URL = "http://localhost:3000/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Authentication API functions
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  // Logout (mainly for logging)
  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },
};

// Customer API functions
export const customerAPI = {
  // Get all customers
  getCustomers: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.customerType)
      params.append("customerType", filters.customerType);
    if (filters.limit) params.append("limit", filters.limit);

    const url = `/customers${params.toString() ? "?" + params.toString() : ""}`;
    const response = await api.get(url);
    return response.data;
  },

  // Get customer by ID
  getCustomer: async (customerId) => {
    const response = await api.get(`/customers/${customerId}`);
    return response.data;
  },

  // Create new customer
  createCustomer: async (customerData) => {
    const response = await api.post("/customers", customerData);
    return response.data;
  },

  // Update customer
  updateCustomer: async (customerId, customerData) => {
    const response = await api.put(`/customers/${customerId}`, customerData);
    return response.data;
  },

  // Delete customer
  deleteCustomer: async (customerId) => {
    const response = await api.delete(`/customers/${customerId}`);
    return response.data;
  },
};

export default api;
