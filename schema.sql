-- Database Schema for TogetherWeGo Application

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS togetherwego;
USE togetherwego;

-- Users table
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('member', 'admin') DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS `Groups` (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organizer_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- User_Group junction table
CREATE TABLE IF NOT EXISTS User_Group (
    user_id INT,
    group_id INT,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `Groups`(group_id) ON DELETE CASCADE
);

-- Trips table
CREATE TABLE IF NOT EXISTS Trips (
    trip_id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES `Groups`(group_id) ON DELETE CASCADE
);

-- Activities table
CREATE TABLE IF NOT EXISTS Activities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10, 2) DEFAULT 0,
    suggested_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_by) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- Budget table
CREATE TABLE IF NOT EXISTS Budget (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    total_budget DECIMAL(10, 2) NOT NULL,
    expenses DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS Expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT,
    trip_id INT,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES Budget(budget_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Itinerary table
CREATE TABLE IF NOT EXISTS Itinerary (
    itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    activity_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE
);

-- Voting table
CREATE TABLE IF NOT EXISTS Voting (
    voting_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    option_type VARCHAR(100) NOT NULL,
    option_value TEXT NOT NULL,
    votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE
);

-- Insert some sample data (optional)
-- INSERT INTO Users (name, email, password, role) VALUES 
-- ('Alice Smith', 'alice@example.com', 'password123', 'member'),
-- ('Bob Johnson', 'bob@example.com', 'password456', 'member'),
-- ('Charlie Brown', 'charlie@example.com', 'password789', 'admin');