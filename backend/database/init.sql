-- Insert default company
INSERT INTO companies (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Dynamics Payments')
ON CONFLICT (id) DO NOTHING;

-- Sample customers for testing 
DO $$
DECLARE
    company_uuid UUID := '550e8400-e29b-41d4-a716-446655440000';
    admin_user_id UUID;
BEGIN
    -- Find or create an admin user for sample data
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- Only insert sample data if we have an admin user
    IF admin_user_id IS NOT NULL THEN
        -- Sample customers
        INSERT INTO customers (company_id, name, email, phone, customer_type, business_type, created_by) VALUES
        (company_uuid, 'El Jibarito Restaurant', 'manager@eljibarito.com', '787-555-0101', 'commercial', 'restaurant', admin_user_id),
        (company_uuid, 'Plaza Las Americas Store #5', 'operations@plaza.com', '787-555-0102', 'commercial', 'retail', admin_user_id),
        (company_uuid, 'Hotel El Convento', 'tech@elconvento.com', '787-555-0103', 'commercial', 'hotel', admin_user_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;