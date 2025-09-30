-- Add room_type column to rooms table and checkout functionality
ALTER TABLE rooms ADD COLUMN room_type TEXT DEFAULT 'Non-AC';

-- Add checkout_date column to bookings table for tracking actual checkout
ALTER TABLE bookings ADD COLUMN checkout_date DATE DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'active';

-- Update existing rooms with room types
UPDATE rooms SET room_type = 'AC' WHERE room_number IN ('101', '201', '301');
UPDATE rooms SET room_type = 'Non-AC' WHERE room_number IN ('102', '103', '202', '203', '302', '303');

-- Add more sample rooms with different types
INSERT OR IGNORE INTO rooms (room_number, room_type) VALUES 
('104', 'AC'),
('105', 'Non-AC'),
('204', 'AC'),
('205', 'Non-AC'),
('304', 'AC'),
('305', 'Non-AC');
