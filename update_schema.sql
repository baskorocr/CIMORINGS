-- Update database schema untuk mendukung semua status OCPP
USE csms_db;

-- Update charging_stations table
ALTER TABLE charging_stations 
MODIFY COLUMN status ENUM('Available', 'Occupied', 'Faulted', 'Unavailable', 'Reserved', 'Preparing', 'Charging', 'SuspendedEVSE', 'SuspendedEV', 'Finishing') DEFAULT 'Unavailable';

-- Update connectors table  
ALTER TABLE connectors 
MODIFY COLUMN status ENUM('Available', 'Occupied', 'Reserved', 'Unavailable', 'Faulted', 'Preparing', 'Charging', 'SuspendedEVSE', 'SuspendedEV', 'Finishing') DEFAULT 'Unavailable';