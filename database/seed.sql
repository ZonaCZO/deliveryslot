
USE deliveryslot;

-- Test users
INSERT INTO users (email, password_hash, role)
VALUES
('carrier@test.com', 'TEST_HASH_NOT_FOR_LOGIN', 'carrier'),
('staff@test.com', 'TEST_HASH_NOT_FOR_LOGIN', 'warehouse_staff');

-- Test delivery slots
INSERT INTO delivery_slots (start_time_utc, end_time_utc, status)
VALUES
('2026-12-03 08:00:00', '2026-12-03 09:00:00', 'open'),
('2026-12-03 09:00:00', '2026-12-03 10:00:00', 'open'),
('2026-12-03 10:00:00', '2026-12-03 11:00:00', 'open');
