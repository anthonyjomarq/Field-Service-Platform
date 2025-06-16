const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  // Auth endpoints
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
  profile: `${API_BASE_URL}/api/auth/profile`,

  // Customer endpoints
  customers: `${API_BASE_URL}/api/customers`,
  customer: (id) => `${API_BASE_URL}/api/customers/${id}`,
  customerHistory: (id) =>
    `${API_BASE_URL}/api/customers/${id}/service-history`,

  // Add more endpoints as needed
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default API_BASE_URL;
