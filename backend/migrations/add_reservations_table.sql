-- Migration: Add reservations table for OCPP 1.6 Reserve functionality
-- Date: 2026-01-06

CREATE TABLE IF NOT EXISTS `reservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `charging_station_id` int NOT NULL,
  `connector_id` int NOT NULL,
  `id_tag` varchar(20) NOT NULL,
  `parent_id_tag` varchar(20) DEFAULT NULL,
  `expiry_date` timestamp NOT NULL,
  `status` enum('Active','Expired','Cancelled','Used') DEFAULT 'Active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reservation_id` (`reservation_id`),
  KEY `charging_station_id` (`charging_station_id`),
  KEY `connector_id` (`connector_id`),
  KEY `id_tag` (`id_tag`),
  KEY `expiry_date` (`expiry_date`),
  CONSTRAINT `fk_reservations_station` FOREIGN KEY (`charging_station_id`) REFERENCES `charging_stations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add index for performance
CREATE INDEX idx_reservation_active ON reservations (status, expiry_date);
CREATE INDEX idx_reservation_connector ON reservations (charging_station_id, connector_id, status);
