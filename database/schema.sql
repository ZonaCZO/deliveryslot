
CREATE DATABASE IF NOT EXISTS deliveryslot
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE deliveryslot;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('carrier', 'warehouse_staff') NOT NULL
);

-- Delivery slots
CREATE TABLE IF NOT EXISTS delivery_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_time_utc DATETIME NOT NULL UNIQUE,
    end_time_utc DATETIME NOT NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',

    CONSTRAINT chk_slot_duration
    CHECK (
        end_time_utc = DATE_ADD(start_time_utc, INTERVAL 60 MINUTE)
    )
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(50) NOT NULL UNIQUE,
    carrier_user_id INT NOT NULL,
    slot_id INT NOT NULL,
    carrier_name VARCHAR(255) NOT NULL,
    truck_registration VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    status ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    active_slot_id INT GENERATED ALWAYS AS (
        CASE
            WHEN status = 'active' THEN slot_id
            ELSE NULL
        END
    ) STORED,

    UNIQUE KEY uq_active_slot (active_slot_id),

    FOREIGN KEY (carrier_user_id) REFERENCES users(id),
    FOREIGN KEY (slot_id) REFERENCES delivery_slots(id)
);
