-- Add user booking fields to existing reservations table
ALTER TABLE reservations 
ADD COLUMN user_id INT NULL,
ADD COLUMN user_name VARCHAR(100) NULL,
ADD COLUMN phone_number VARCHAR(20) NULL;
