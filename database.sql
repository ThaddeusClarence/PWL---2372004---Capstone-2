CREATE DATABASE IF NOT EXISTS lab_management;
USE lab_management;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('Administrator', 'Kepala Laboratorium', 'Ketua Program Studi', 'Staf Administrasi', 'Staf Laboratorium') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms Table (Ruangan)
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table (Aset)
CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE,
    name VARCHAR(150) NOT NULL,
    room_id INT,
    status ENUM('Active', 'Maintenance', 'Disposed') DEFAULT 'Active',
    item_condition VARCHAR(100),
    qr_code_path VARCHAR(255),
    qr_code_prodi_path VARCHAR(255),
    received_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Consumables Table (BHP)
CREATE TABLE consumables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    stock INT DEFAULT 0,
    unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Procurements Table (Draf Pengadaan)
CREATE TABLE procurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year YEAR NOT NULL,
    title VARCHAR(150) NOT NULL,
    status ENUM('Draft', 'Locked', 'Finalized') DEFAULT 'Draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Procurement Items Table
CREATE TABLE procurement_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procurement_id INT NOT NULL,
    item_type ENUM('Inventory', 'Consumable') NOT NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    quantity INT NOT NULL,
    link VARCHAR(255),
    replace_inventory_id INT NULL,
    approval_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    received_date DATE NULL,
    FOREIGN KEY (procurement_id) REFERENCES procurements(id) ON DELETE CASCADE,
    FOREIGN KEY (replace_inventory_id) REFERENCES inventory(id) ON DELETE SET NULL
);

-- Maintenance Logs Table
CREATE TABLE maintenance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_id INT NOT NULL,
    user_id INT NOT NULL,
    maintenance_date DATETIME NOT NULL,
    description TEXT,
    previous_condition VARCHAR(100),
    new_condition VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Maintenance Consumable Usage Table (Penggunaan BHP saat maintenance)
CREATE TABLE maintenance_consumables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maintenance_log_id INT NOT NULL,
    consumable_id INT NOT NULL,
    quantity_used INT NOT NULL,
    FOREIGN KEY (maintenance_log_id) REFERENCES maintenance_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE CASCADE
);

-- Insert 5 initial users
-- Passwords are set to '123456' using basic text for now to ease development testing.
-- In production, these should be hashed (e.g. bcrypt).
INSERT INTO users (email, password, name, role) VALUES
('admin@lab.com', '123456', 'Administrator Lab', 'Administrator'),
('kalab@lab.com', '123456', 'Kepala Laboratorium', 'Kepala Laboratorium'),
('kaprodi@lab.com', '123456', 'Ketua Program Studi', 'Ketua Program Studi'),
('stafadmin@lab.com', '123456', 'Staf Administrasi', 'Staf Administrasi'),
('staflab@lab.com', '123456', 'Staf Laboratorium', 'Staf Laboratorium');
