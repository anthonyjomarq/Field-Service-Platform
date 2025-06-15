DO $$
DECLARE
    admin_user_id UUID;
    company_id UUID;
BEGIN
    -- Check if we already have data
    IF NOT EXISTS (SELECT 1 FROM companies LIMIT 1) THEN
        -- Insert default company
        INSERT INTO companies (id, name) 
        VALUES ('11111111-1111-1111-1111-111111111111', 'Field Service Solutions Inc.')
        ON CONFLICT DO NOTHING;
        
        company_id := '11111111-1111-1111-1111-111111111111';

        -- Insert admin user (password: admin123)
        INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active) 
        VALUES (
            '11111111-1111-1111-1111-111111111111',
            company_id,
            'admin@fieldservice.com',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewTFYP0qpKB.ZQ.2', -- admin123
            'System',
            'Administrator', 
            'admin',
            TRUE
        ) ON CONFLICT DO NOTHING;

        admin_user_id := '11111111-1111-1111-1111-111111111111';

        -- Insert sample customers for Puerto Rico field service
        INSERT INTO customers (id, company_id, name, email, phone, customer_type, business_type, created_by) VALUES 
        (
            '11111111-1111-1111-1111-111111111111',
            company_id,
            'La Placita Restaurant',
            'manager@laplacita.pr',
            '787-555-0101',
            'commercial',
            'restaurant',
            admin_user_id
        ),
        (
            '22222222-2222-2222-2222-222222222222', 
            company_id,
            'Plaza Las Américas Mall',
            'operations@plazalasamericas.com',
            '787-555-0202',
            'commercial', 
            'retail',
            admin_user_id
        ),
        (
            '33333333-3333-3333-3333-333333333333',
            company_id,
            'Hotel El Convento',
            'maintenance@elconvento.com',
            '787-555-0303',
            'commercial',
            'hotel', 
            admin_user_id
        ) ON CONFLICT DO NOTHING;

        -- Insert sample locations with Puerto Rico addresses
        
        -- La Placita Restaurant (Old San Juan)
        INSERT INTO customer_locations (
            customer_id, address_type, street_address, city, state, postal_code, country,
            latitude, longitude, access_notes, is_primary, contact_person, service_hours
        ) VALUES (
            '11111111-1111-1111-1111-111111111111',
            'primary',
            '251 Calle de San Francisco',
            'San Juan',
            'PR', 
            '00901',
            'US',
            18.4655, -66.1057,
            'Historic district location. Parking available on Plaza San José. Enter through main entrance facing the plaza.',
            TRUE,
            'Maria Rodriguez - Manager',
            'Mon-Thu 5PM-12AM, Fri-Sat 5PM-2AM, Sun 5PM-11PM'
        ) ON CONFLICT DO NOTHING;

        -- Plaza Las Américas Mall (Hato Rey)
        INSERT INTO customer_locations (
            customer_id, address_type, street_address, city, state, postal_code, country,
            latitude, longitude, access_notes, is_primary, contact_person, service_hours
        ) VALUES (
            '22222222-2222-2222-2222-222222222222',
            'primary', 
            '525 Avenida Franklin Delano Roosevelt',
            'San Juan',
            'PR',
            '00918',
            'US',
            18.4267, -66.0714,
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
        RAISE NOTICE 'Sample data already exists - skipping initialization';
    END IF;
END $$;