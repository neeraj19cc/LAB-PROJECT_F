-- Adding room status tracking and manual vacate support
-- Update rooms table to include status field for availability management
ALTER TABLE rooms ADD COLUMN status TEXT DEFAULT 'available';

-- Update existing rooms to have available status
UPDATE rooms SET status = 'available' WHERE status IS NULL;

-- Add index for better performance on room status queries
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_number, check_in, check_out);

-- Insert additional sample rooms for testing room management
INSERT OR IGNORE INTO rooms (room_number, room_type, status) VALUES 
('401', 'AC', 'available'),
('402', 'Non-AC', 'available'),
('403', 'AC', 'available'),
('501', 'Non-AC', 'available'),
('502', 'AC', 'available');

-- Create a view for room occupancy status
CREATE VIEW IF NOT EXISTS room_occupancy_view AS
SELECT 
    r.room_number,
    r.room_type,
    r.status as room_status,
    CASE 
        WHEN b.id IS NOT NULL THEN 'occupied'
        ELSE 'available'
    END as occupancy_status,
    b.guest_name,
    b.check_in,
    b.check_out,
    b.status as booking_status
FROM rooms r
LEFT JOIN bookings b ON r.room_number = b.room_number 
    AND b.status = 'active' 
    AND b.check_in <= date('now') 
    AND b.check_out > date('now');
