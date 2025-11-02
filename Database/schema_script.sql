-- Schema: Emergency_Dispatcher
CREATE DATABASE IF NOT EXISTS Emergency_Dispatcher;
USE Emergency_Dispatcher;

-- Table: user
CREATE TABLE IF NOT EXISTS `user` (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('DISPATCHER', 'RESPONDER', 'ADMIN') NOT NULL DEFAULT 'DISPATCHER'
) ENGINE=InnoDB;

-- Table: station
CREATE TABLE IF NOT EXISTS station (
  station_id INT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('FIRE', 'POLICE', 'MEDICAL') NOT NULL,
  location POINT NOT NULL SRID 4326,
  zone VARCHAR(45)
) ENGINE=InnoDB;

-- Table: vehicle
CREATE TABLE IF NOT EXISTS vehicle (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
  `status` ENUM('AVAILABLE', 'PENDING', 'ON_ROUTE') NOT NULL DEFAULT 'AVAILABLE',
  location POINT NOT NULL SRID 4326,
  capacity INT NOT NULL,
  station_id INT NOT NULL,
  CONSTRAINT fk_vehicle_station
    FOREIGN KEY (station_id) REFERENCES station(station_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Table: incident
CREATE TABLE IF NOT EXISTS incident (
  incident_id INT AUTO_INCREMENT PRIMARY KEY,
  time_reported DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  time_resolved DATETIME,
  location POINT NOT NULL SRID 4326,
  `type` ENUM('FIRE', 'POLICE', 'MEDICAL') NOT NULL,
  `status` ENUM('REPORTED', 'ASSIGNED', 'RESOLVED') NOT NULL DEFAULT 'REPORTED',
  severity_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL
) ENGINE=InnoDB;

-- Table: responder_vehicle
CREATE TABLE IF NOT EXISTS responder_vehicle (
  vehicle_id INT NOT NULL,
  responder_id INT NOT NULL PRIMARY KEY,
  CONSTRAINT fk_responder_vehicle_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicle(vehicle_id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_responder_vehicle_user
    FOREIGN KEY (responder_id) REFERENCES user(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Table: dispatch
CREATE TABLE IF NOT EXISTS dispatch (
  dispatch_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  incident_id INT NOT NULL,
  dispatcher_id INT,
  UNIQUE (vehicle_id, incident_id),
  CONSTRAINT fk_dispatch_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicle(vehicle_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_incident
    FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dispatch_dispatcher
    FOREIGN KEY (dispatcher_id) REFERENCES user(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Table: admin_notification
CREATE TABLE IF NOT EXISTS admin_notification (
  admin_notification_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table: admin_notification_status
CREATE TABLE IF NOT EXISTS admin_notification_status (
  admin_id INT NOT NULL,
  admin_notification_id INT NOT NULL,
  `status` ENUM('SEEN', 'DELIVERED') NOT NULL DEFAULT 'DELIVERED',
  PRIMARY KEY (admin_id, admin_notification_id),
  CONSTRAINT fk_admin_id
    FOREIGN KEY (admin_id) REFERENCES user(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_admin_notification_id
    FOREIGN KEY (admin_notification_id) REFERENCES admin_notification(admin_notification_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Table: user_notification
CREATE TABLE IF NOT EXISTS user_notification (
  user_notification_id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  title VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_notif_incident
    FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Table: user_notification_status
CREATE TABLE IF NOT EXISTS user_notification_status (
  user_notification_id INT NOT NULL,
  user_id INT NOT NULL,
  `status` ENUM('SEEN', 'DELIVERED') NOT NULL DEFAULT 'DELIVERED',
  PRIMARY KEY (user_notification_id, user_id),
  CONSTRAINT fk_user_id
    FOREIGN KEY (user_id) REFERENCES user(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_notification_id
    FOREIGN KEY (user_notification_id) REFERENCES user_notification(user_notification_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;