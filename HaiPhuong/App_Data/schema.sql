-- Cấu trúc cơ sở dữ liệu hệ thống Hải Phương (MySQL)

CREATE DATABASE IF NOT EXISTS `haiphuong_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `haiphuong_db`;

-- 1. Bảng MachineTypes
CREATE TABLE IF NOT EXISTS `MachineTypes` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `Code` VARCHAR(50) NOT NULL UNIQUE,
    `Name` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(500) NULL,
    `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Bảng MachineTypeAttributes
CREATE TABLE IF NOT EXISTS `MachineTypeAttributes` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `MachineTypeId` INT NOT NULL,
    `AttributeKey` VARCHAR(50) NOT NULL,
    `DisplayName` VARCHAR(100) NOT NULL,
    `Unit` VARCHAR(20) NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    `InputType` VARCHAR(20) NOT NULL DEFAULT 'text',
    FOREIGN KEY (`MachineTypeId`) REFERENCES `MachineTypes`(`Id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_type_attr` (`MachineTypeId`, `AttributeKey`)
) ENGINE=InnoDB;

-- 3. Bảng Machines
CREATE TABLE IF NOT EXISTS `Machines` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `MachineCode` VARCHAR(20) NOT NULL UNIQUE,
    `Name` VARCHAR(100) NOT NULL,
    `MachineTypeId` INT NOT NULL,
    `IsMonitored` TINYINT(1) NOT NULL DEFAULT 1,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'stopped',
    `IpAddress` VARCHAR(50) NULL,
    `Port` INT NULL,
    `AttributesJson` TEXT NULL,
    `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`MachineTypeId`) REFERENCES `MachineTypes`(`Id`)
) ENGINE=InnoDB;

-- 4. Bảng ProductionOrders
CREATE TABLE IF NOT EXISTS `ProductionOrders` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `OrderNo` VARCHAR(50) NOT NULL UNIQUE,
    `ProductCode` VARCHAR(50) NOT NULL,
    `ProductName` VARCHAR(200) NOT NULL,
    `TotalQuantity` INT NOT NULL,
    `Unit` VARCHAR(20) NOT NULL DEFAULT 'PCS',
    `Status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Bảng MachineOrders
CREATE TABLE IF NOT EXISTS `MachineOrders` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `MachineId` INT NOT NULL,
    `OrderId` INT NOT NULL,
    `TargetQuantity` INT NOT NULL,
    `ActualQuantity` INT NOT NULL DEFAULT 0,
    `AssignedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `CompletedAt` DATETIME NULL,
    FOREIGN KEY (`MachineId`) REFERENCES `Machines`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`OrderId`) REFERENCES `ProductionOrders`(`Id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_machine_order` (`MachineId`, `OrderId`)
) ENGINE=InnoDB;

-- 6. Bảng MachineShifts
CREATE TABLE IF NOT EXISTS `MachineShifts` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `MachineId` INT NOT NULL,
    `ShiftType` VARCHAR(20) NOT NULL,
    `StartTime` TIME NOT NULL,
    `EndTime` TIME NOT NULL,
    `EffectiveDate` DATE NOT NULL,
    FOREIGN KEY (`MachineId`) REFERENCES `Machines`(`Id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Bảng ProductionLogs
CREATE TABLE IF NOT EXISTS `ProductionLogs` (
    `Id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `MachineId` INT NOT NULL,
    `OrderId` INT NULL,
    `Timestamp` DATETIME NOT NULL,
    `ActualStrokes` INT NOT NULL DEFAULT 0,
    `RunningSeconds` INT NOT NULL DEFAULT 0,
    `SetupSeconds` INT NOT NULL DEFAULT 0,
    `Status` VARCHAR(20) NOT NULL,
    FOREIGN KEY (`MachineId`) REFERENCES `Machines`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`OrderId`) REFERENCES `ProductionOrders`(`Id`) ON DELETE SET NULL,
    INDEX `idx_log_machine_time` (`MachineId`, `Timestamp`)
) ENGINE=InnoDB;

-- 8. Bảng Alarms
CREATE TABLE IF NOT EXISTS `Alarms` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `MachineId` INT NOT NULL,
    `OrderId` INT NULL,
    `Code` VARCHAR(50) NOT NULL,
    `Severity` VARCHAR(20) NOT NULL,
    `Description` VARCHAR(500) NOT NULL,
    `Timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'emergency',
    `ResolvedAt` DATETIME NULL,
    FOREIGN KEY (`MachineId`) REFERENCES `Machines`(`Id`) ON DELETE CASCADE,
    FOREIGN KEY (`OrderId`) REFERENCES `ProductionOrders`(`Id`) ON DELETE SET NULL,
    INDEX `idx_alarm_machine_time` (`MachineId`, `Timestamp`)
) ENGINE=InnoDB;
