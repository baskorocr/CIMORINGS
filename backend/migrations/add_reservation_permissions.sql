-- Add reservation permissions
INSERT IGNORE INTO permissions (name, description) VALUES 
('view_reservations', 'View reservations'),
('manage_reservations', 'Create and cancel reservations');

-- Add permissions to admin role (assuming role id 1 is admin)
INSERT IGNORE INTO role_permissions (role_id, permission_id) 
SELECT 1, id FROM permissions WHERE name IN ('view_reservations', 'manage_reservations');
