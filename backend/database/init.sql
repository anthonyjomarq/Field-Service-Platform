-- Insert default company
INSERT INTO companies (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Dynamics Payments')
ON CONFLICT (id) DO NOTHING;

-- Sample customers for testing with enhanced location data
DO $$
DECLARE
    company_uuid UUID := '550e8400-e29b-41d4-a716-446655440000';
    admin_user_id UUID;
    jibarito_id UUID;
    plaza_id UUID;
    convento_id UUID;
BEGIN
    -- Find or create an admin user for sample data
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- Only insert sample data if we have an admin user
    IF admin_user_id IS NOT NULL THEN
        -- Sample customers with better data structure
        INSERT INTO customers (id, company_id, name, email, phone, customer_type, business_type, created_by) VALUES
        ('11111111-1111-1111-1111-111111111111', company_uuid, 'El Jibarito Restaurant', 'manager@eljibarito.com', '787-555-0101', 'commercial', 'restaurant', admin_user_id),
        ('22222222-2222-2222-2222-222222222222', company_uuid, 'Plaza Las Americas Store #5', 'operations@plaza.com', '787-555-0102', 'commercial', 'retail', admin_user_id),
        ('33333333-3333-3333-3333-333333333333', company_uuid, 'Hotel El Convento', 'tech@elconvento.com', '787-555-0103', 'commercial', 'hotel', admin_user_id)
        ON CONFLICT (id) DO NOTHING;

        -- Add sample locations with coordinates (Puerto Rico locations)
        
        -- El Jibarito Restaurant (Old San Juan)
        INSERT INTO customer_locations (
            customer_id, address_type, street_address, city, state, postal_code, country,
            latitude, longitude, access_notes, is_primary, contact_person, service_hours
        ) VALUES (
            '11111111-1111-1111-1111-111111111111', 
            'primary',
            '280 Calle del Cristo',
            'San Juan',
            'PR',
            '00901',
            'US',
            18.4647, -66.1164,
            'Located in Old San Juan, historic building. Use main entrance on Cristo Street.',
            TRUE,
            'Maria Rodriguez - Manager',
            'Mon-Sun 11AM-10PM'
        ) ON CONFLICT DO NOTHING;

        -- Plaza Las Americas (Hato Rey)
        INSERT INTO customer_locations (
            customer_id, address_type, street_address, city, state, postal_code, country,
            latitude, longitude, access_notes, is_primary, contact_person, service_hours
        ) VALUES (
            '22222222-2222-2222-2222-222222222222',
            'primary', 
            '525 Ave Franklin Delano Roosevelt',
            'San Juan',
            'PR',
            '00918',
            'US',
            18.4242, -66.0748,
            'Large shopping mall. Use service entrance near food court. Security clearance required.',
            TRUE,
            'Carlos Mendez - Operations',
            'Mon-Sat 9AM-9PM, Sun 11AM-7PM'
        ) ON CONFLICT DO NOTHING;

        -- Hotel El Convento (Old San Juan)  
        INSERT INTO customer_locations (
            customer_id, address_type, street_address, city, state, postal_code, country,
            latitude, longitude, access_notes, is_primary, contact_person, service_hours
        ) VALUES (
            '33333333-3333-3333-3333-333333333333',
            'primary',
            '100 Calle del Cristo', 
            'San Juan',
            'PR',
            '00901',
            'US',
            18.4651, -66.1175,
            'Historic hotel in Old San Juan. Use main lobby entrance. Valet parking available.',
            TRUE,
            'Robert - Front Desk Manager',
            '24/7 - Hotel Reception'
        ) ON CONFLICT DO NOTHING;

        -- Add some sample equipment
        INSERT INTO customer_equipment (
            customer_id, equipment_type, brand, model, serial_number, 
            install_date, status, notes
        ) VALUES 
        ('11111111-1111-1111-1111-111111111111', 'POS', 'Square', 'Terminal Plus', 'SQ123456789', '2024-01-15', 'active', 'Main register terminal'),
        ('11111111-1111-1111-1111-111111111111', 'Card_Reader', 'Square', 'Contactless Reader', 'SQ987654321', '2024-01-15', 'active', 'Backup payment terminal'),
        ('22222222-2222-2222-2222-222222222222', 'POS', 'Clover', 'Station Pro', 'CLV445566778', '2024-02-01', 'active', 'Store #5 main terminal'),
        ('33333333-3333-3333-3333-333333333333', 'Mobile_Terminal', 'Square', 'Reader A100', 'SQ112233445', '2024-01-30', 'active', 'Front desk mobile payment')
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample data inserted successfully';
    ELSE
        RAISE NOTICE 'No admin user found - skipping sample data insertion';
    END IF;
END $$;