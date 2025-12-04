-- Database schema for Charging Station Management System
CREATE DATABASE IF NOT EXISTS charging_station_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE charging_station_db;

-- Table: charging_stations
CREATE TABLE IF NOT EXISTS charging_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    total_ports INT DEFAULT 0,
    available_ports INT DEFAULT 0,
    status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
    charging_type ENUM('AC', 'DC', 'Both') DEFAULT 'Both',
    power_kw DECIMAL(5, 2) DEFAULT 0.00,
    price_per_kwh DECIMAL(10, 2) DEFAULT 0.00,
    operating_hours VARCHAR(100) DEFAULT '24/7',
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: charging_sessions
CREATE TABLE IF NOT EXISTS charging_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    port_number INT NOT NULL,
    user_name VARCHAR(255),
    vehicle_type VARCHAR(100),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    energy_consumed DECIMAL(10, 2) DEFAULT 0.00,
    cost DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data
INSERT INTO charging_stations (name, address, location_lat, location_lng, total_ports, available_ports, status, charging_type, power_kw, price_per_kwh, operating_hours, phone, email) VALUES
('Trạm sạc Trung tâm Hà Nội', '123 Đường Láng, Đống Đa, Hà Nội', 21.0285, 105.8542, 8, 5, 'active', 'Both', 50.00, 5000.00, '24/7', '0241234567', 'hanoi@charging.com'),
('Trạm sạc Quận 1 TP.HCM', '456 Nguyễn Huệ, Quận 1, TP.HCM', 10.7769, 106.7009, 6, 3, 'active', 'DC', 150.00, 6000.00, '6:00 - 22:00', '0287654321', 'hcm@charging.com'),
('Trạm sạc Đà Nẵng', '789 Bạch Đằng, Hải Châu, Đà Nẵng', 16.0544, 108.2022, 4, 2, 'active', 'AC', 22.00, 4500.00, '24/7', '0236123456', 'danang@charging.com'),
('Trạm sạc Bảo trì', '321 Đường ABC, Quận XYZ', 21.0000, 105.8000, 4, 0, 'maintenance', 'Both', 50.00, 5000.00, '24/7', '0249999999', 'maintenance@charging.com');

