-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Companies table (multi-tenant ready)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (migrate from JSON)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'technician' CHECK (role IN ('admin', 'dispatcher', 'technician', 'customer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced customers table with better validation
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  customer_type VARCHAR(20) DEFAULT 'commercial' CHECK (customer_type IN ('residential', 'commercial')),
  business_type VARCHAR(100), -- 'restaurant', 'retail', 'hotel', etc.
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Enhanced customer locations with PostGIS spatial data
CREATE TABLE IF NOT EXISTS customer_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_type VARCHAR(50) DEFAULT 'service' CHECK (address_type IN ('primary', 'billing', 'service', 'mailing')),
  
  -- Address components (normalized)
  street_address TEXT NOT NULL,
  address_line_2 TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'US',
  
  -- Legacy coordinate fields (kept for backward compatibility)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- PostGIS spatial column (this is what we'll use for route optimization)
  geom GEOMETRY(POINT, 4326),
  
  -- Address validation and geocoding data
  address_components JSONB, -- Store structured address from Google
  geocoding_confidence DECIMAL(3,2), -- 0.00 to 1.00 confidence score
  geocoding_accuracy VARCHAR(50), -- 'ROOFTOP', 'RANGE_INTERPOLATED', etc.
  plus_code VARCHAR(20), -- Google Plus Code for precise location
  formatted_address TEXT, -- Google's formatted address
  
  -- Service-specific fields
  access_notes TEXT,
  gate_code VARCHAR(50),
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  service_hours VARCHAR(100), -- e.g., "Mon-Fri 9AM-5PM"
  
  -- Metadata
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment tracking (enhanced for payment systems)
CREATE TABLE IF NOT EXISTS customer_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES customer_locations(id),
  equipment_type VARCHAR(50) NOT NULL, -- 'POS', 'Card_Reader', 'Mobile_Terminal'
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  install_date DATE,
  warranty_expiry DATE,
  last_service_date DATE,
  next_service_date DATE,
  service_interval_days INTEGER DEFAULT 90,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route optimization cache table (for performance)
CREATE TABLE IF NOT EXISTS route_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_key VARCHAR(255) UNIQUE NOT NULL, -- Hash of origin + destinations
  route_data JSONB NOT NULL, -- Cached route response from Google
  distance_matrix JSONB, -- Cached distance matrix
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);

-- Location indexes (including spatial)
CREATE INDEX IF NOT EXISTS idx_customer_locations_customer_id ON customer_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_locations_primary ON customer_locations(customer_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_locations_active ON customer_locations(customer_id) WHERE is_active = TRUE;

-- PostGIS spatial indexes (CRITICAL for route optimization performance)
CREATE INDEX IF NOT EXISTS idx_customer_locations_geom ON customer_locations USING GIST (geom) WHERE geom IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_locations_geom_active ON customer_locations USING GIST (geom) WHERE geom IS NOT NULL AND is_active = TRUE;

-- Coordinate-based indexes (for legacy support)
CREATE INDEX IF NOT EXISTS idx_customer_locations_coords ON customer_locations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_location_id ON customer_equipment(location_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_type ON customer_equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_status ON customer_equipment(status);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_next_service ON customer_equipment(next_service_date) WHERE status = 'active';

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(company_id) WHERE is_active = TRUE;

-- Route cache indexes
CREATE INDEX IF NOT EXISTS idx_route_cache_key ON route_cache(route_key);
CREATE INDEX IF NOT EXISTS idx_route_cache_expires ON route_cache(expires_at);

-- Add trigger to automatically update geom when lat/lng changes
CREATE OR REPLACE FUNCTION update_location_geom() 
RETURNS TRIGGER AS $$
BEGIN
  -- If latitude and longitude are provided, create PostGIS geometry
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_location_geom ON customer_locations;
CREATE TRIGGER trigger_update_location_geom
  BEFORE INSERT OR UPDATE ON customer_locations
  FOR EACH ROW EXECUTE FUNCTION update_location_geom();

-- Trigger to update customers updated_at when locations change
CREATE OR REPLACE FUNCTION update_customer_timestamp() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET updated_at = NOW() WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_on_location_change ON customer_locations;
CREATE TRIGGER trigger_update_customer_on_location_change
  AFTER INSERT OR UPDATE ON customer_locations
  FOR EACH ROW EXECUTE FUNCTION update_customer_timestamp();