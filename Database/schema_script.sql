-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema Emergency_Dispatcher
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema Emergency_Dispatcher
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `Emergency_Dispatcher` DEFAULT CHARACTER SET utf8 ;
USE `Emergency_Dispatcher` ;

-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`user` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('DISPATCHER', 'RESPONDER', 'ADMIN') NOT NULL DEFAULT 'DISPATCHER',
  PRIMARY KEY (`user_id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`station`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`station` (
  `station_id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('FIRE', 'POLICE', 'MEDICAL') NOT NULL DEFAULT 'FIRE',
  `location` POINT NOT NULL,
  `zone` VARCHAR(45) NULL,
  PRIMARY KEY (`station_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`vehicle`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`vehicle` (
  `vehicle_id` INT NOT NULL AUTO_INCREMENT,
  `status` ENUM('AVAILABLE', 'ON_ROUTE') NOT NULL DEFAULT 'AVAILABLE',
  `location` POINT NOT NULL,
  `capacity` INT NOT NULL,
  `station_id` INT NOT NULL,
  PRIMARY KEY (`vehicle_id`),
  INDEX `station_id_idx` (`station_id` ASC) VISIBLE,
  CONSTRAINT `fk_station_id`
    FOREIGN KEY (`station_id`)
    REFERENCES `Emergency_Dispatcher`.`station` (`station_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`incident`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`incident` (
  `incident_id` INT NOT NULL AUTO_INCREMENT,
  `time_reported` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `time_resolved` DATETIME NULL DEFAULT NULL,
  `location` POINT NOT NULL,
  `status` ENUM('REPORTED', 'ASSIGNED', 'RESOLVED') NOT NULL DEFAULT 'REPORTED',
  `severity_level` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
  PRIMARY KEY (`incident_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`responder_vehicle`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`responder_vehicle` (
  `vehicle_id` INT NOT NULL,
  `responder_id` INT NOT NULL,
  PRIMARY KEY (`vehicle_id`, `responder_id`),
  INDEX `responder_id_idx` (`responder_id` ASC) VISIBLE,
  CONSTRAINT `fk_vehicle_id`
    FOREIGN KEY (`vehicle_id`)
    REFERENCES `Emergency_Dispatcher`.`vehicle` (`vehicle_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_responder_id`
    FOREIGN KEY (`responder_id`)
    REFERENCES `Emergency_Dispatcher`.`user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`DISPATCH`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`DISPATCH` (
  `dispatch_id` INT NOT NULL,
  `vehicle_id` INT NOT NULL,
  `incident_id` INT NOT NULL,
  PRIMARY KEY (`dispatch_id`, `vehicle_id`, `incident_id`),
  INDEX `vehicle_id_idx` (`vehicle_id` ASC) VISIBLE,
  INDEX `incident_id_idx` (`incident_id` ASC) VISIBLE,
  CONSTRAINT `fk_dispatch_id`
    FOREIGN KEY (`dispatch_id`)
    REFERENCES `Emergency_Dispatcher`.`user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_dispatch_vehicle_id`
    FOREIGN KEY (`vehicle_id`)
    REFERENCES `Emergency_Dispatcher`.`vehicle` (`vehicle_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_incident_id`
    FOREIGN KEY (`incident_id`)
    REFERENCES `Emergency_Dispatcher`.`incident` (`incident_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`admin_notification`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`admin_notification` (
  `notification_id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `body` TEXT NOT NULL,
  PRIMARY KEY (`notification_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`notify_admin`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`notify_admin` (
  `admin_id` INT NOT NULL,
  `admin_notification_id` INT NOT NULL,
  `status` ENUM('SEEN', 'DELIVERED') NOT NULL DEFAULT 'DELIVERED',
  PRIMARY KEY (`admin_id`, `admin_notification_id`),
  INDEX `admin_notification_id_idx` (`admin_notification_id` ASC) VISIBLE,
  CONSTRAINT `fk_admin_id`
    FOREIGN KEY (`admin_id`)
    REFERENCES `Emergency_Dispatcher`.`user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_admin_notification_id`
    FOREIGN KEY (`admin_notification_id`)
    REFERENCES `Emergency_Dispatcher`.`admin_notification` (`notification_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`responder_dispatcher_notification`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`responder_dispatcher_notification` (
  `responder_dispatcher_notification_id` INT NOT NULL,
  `status` ENUM('SEEN', 'DELIVERED') NOT NULL DEFAULT 'DELIVERED',
  `user_id` INT NOT NULL,
  PRIMARY KEY (`responder_dispatcher_notification_id`),
  INDEX `user_id_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `Emergency_Dispatcher`.`user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Emergency_Dispatcher`.`notify_responder_dispatcher`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Dispatcher`.`notify_responder_dispatcher` (
  `responder_dispatcher_notification_id` INT NOT NULL,
  `incident_id` INT NOT NULL,
  PRIMARY KEY (`responder_dispatcher_notification_id`, `incident_id`),
  INDEX `incident_id_idx` (`incident_id` ASC) VISIBLE,
  CONSTRAINT `fk_rd_incident_id`
    FOREIGN KEY (`incident_id`)
    REFERENCES `Emergency_Dispatcher`.`incident` (`incident_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_responder_dispatcher_notification_id`
    FOREIGN KEY (`responder_dispatcher_notification_id`)
    REFERENCES `Emergency_Dispatcher`.`responder_dispatcher_notification` (`responder_dispatcher_notification_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
admin_notificationadmin_notification