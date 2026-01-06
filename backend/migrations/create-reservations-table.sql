-- Create reservations table for OCPP ReserveNow functionality
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `charging_station_id` int NOT NULL,
  `connector_id` int NOT NULL,
  `id_tag` varchar(20) NOT NULL,
  `parent_id_tag` varchar(20) DEFAULT NULL,
  `expiry_date` timestamp NOT NULL,
  `status` enum('Active','Cancelled','Expired','Used') DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reservation_id` (`reservation_id`),
  KEY `charging_station_id` (`charging_station_id`),
  KEY `connector_id` (`connector_id`),
  KEY `status` (`status`),
  KEY `expiry_date` (`expiry_date`),
  CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`charging_station_id`) REFERENCES `charging_stations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add reservation permissions
INSERT IGNORE INTO `permissions` (`name`, `display_name`, `description`, `group_name`) VALUES
('view_reservations', 'View Reservations', 'Can view reservation list', 'Reservation Management'),
('manage_reservations', 'Manage Reservations', 'Can create and cancel reservations', 'Reservation Management');

-- Grant reservation permissions to admin and super-admin roles
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT r.id, p.id 
FROM `roles` r, `permissions` p 
WHERE r.name IN ('admin', 'super-admin') 
AND p.name IN ('view_reservations', 'manage_reservations');
