// APP Configuration
const config = {
  api: {
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
    timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  },
  google: {
    mapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  },
  features: {
    routeOptimization:
      process.env.REACT_APP_ENABLE_ROUTE_OPTIMIZATION === "true",
    workOrders: process.env.REACT_APP_ENABLE_WORK_ORDERS === "true",
    equipmentTracking:
      process.env.REACT_APP_ENABLE_EQUIPMENT_TRACKING === "true",
  },
  app: {
    name: process.env.REACT_APP_NAME || "Field Service Platform",
    version: process.env.REACT_APP_VERSION || "1.0.0",
    env: process.env.REACT_APP_ENV || "development",
  },
};

export default config;
