/*
 Navicat MySQL Data Transfer

 Source Server         : SterlingDB - MariaDB
 Source Server Type    : MariaDB
 Source Server Version : 100508
 Source Host           : data.sterlingdb.com:3306
 Source Schema         : waters_refuge_ball

 Target Server Type    : MariaDB
 Target Server Version : 100508
 File Encoding         : 65001

 Date: 08/11/2023 09:09:04
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for eventAttendees
-- ----------------------------
DROP TABLE IF EXISTS `eventAttendees`;
CREATE TABLE `eventAttendees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(64) DEFAULT NULL,
  `eventDate` date DEFAULT NULL,
  `tableNumber` int(11) DEFAULT NULL,
  `isHostess` tinyint(1) DEFAULT 0,
  `specialDinner` tinyint(1) DEFAULT 0,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `specialCode` varchar(255) DEFAULT NULL,
  `hasPaid` tinyint(1) DEFAULT 0,
  `isFree` tinyint(1) DEFAULT 0,
  `paidCash` tinyint(1) DEFAULT 0,
  `confirmation_email_sent` tinyint(1) DEFAULT 0,
  `confirmation_text_sent` tinyint(1) DEFAULT 0,
  `invitation_email_sent` tinyint(1) DEFAULT 0,
  `created` datetime DEFAULT NULL,
  `deleted` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `originalData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=299 DEFAULT CHARSET=utf8;


-- ----------------------------
-- Table structure for eventCosts
-- ----------------------------
DROP TABLE IF EXISTS `eventCosts`;
CREATE TABLE `eventCosts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hostess` double(11,2) DEFAULT NULL,
  `general` double(11,2) DEFAULT NULL,
  `specialDinner` double(11,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of eventCosts
-- ----------------------------
BEGIN;
INSERT INTO `eventCosts` VALUES (1, 20.00, 30.00, 5.00);
COMMIT;

-- ----------------------------
-- Table structure for eventDates
-- ----------------------------
DROP TABLE IF EXISTS `eventDates`;
CREATE TABLE `eventDates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventDate` date DEFAULT NULL,
  `numberOfTables` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of eventDates
-- ----------------------------
BEGIN;
INSERT INTO `eventDates` VALUES (1, '2024-04-10', 40);
INSERT INTO `eventDates` VALUES (2, '2024-04-11', 40);
INSERT INTO `eventDates` VALUES (3, '2024-04-12', 40);
COMMIT;

-- ----------------------------
-- Table structure for eventPayments
-- ----------------------------
DROP TABLE IF EXISTS `eventPayments`;
CREATE TABLE `eventPayments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) DEFAULT NULL,
  `paymentId` varchar(255) DEFAULT NULL,
  `orderId` varchar(255) DEFAULT NULL,
  `receiptUrl` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `cardBrand` varchar(255) DEFAULT NULL,
  `last4` varchar(255) DEFAULT NULL,
  `amount` int(11) DEFAULT NULL,
  `payment` text DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8;


-- ----------------------------
-- Table structure for eventTables
-- ----------------------------
DROP TABLE IF EXISTS `eventTables`;
CREATE TABLE `eventTables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tableNumber` int(11) DEFAULT NULL,
  `eventDate` date DEFAULT NULL,
  `seats` int(11) DEFAULT NULL,
  `hostessId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=204 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of eventTables
-- ----------------------------
BEGIN;
INSERT INTO `eventTables` VALUES (84, 1, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (85, 2, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (86, 3, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (87, 4, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (88, 5, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (89, 6, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (90, 7, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (91, 8, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (92, 9, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (93, 10, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (94, 11, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (95, 12, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (96, 13, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (97, 14, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (98, 15, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (99, 16, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (100, 17, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (101, 18, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (102, 19, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (103, 20, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (104, 21, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (105, 22, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (106, 23, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (107, 24, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (108, 25, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (109, 26, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (110, 27, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (111, 28, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (112, 29, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (113, 30, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (114, 31, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (115, 32, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (116, 33, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (117, 34, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (118, 35, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (119, 36, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (120, 37, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (121, 38, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (122, 39, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (123, 40, '2024-04-10', 8, NULL);
INSERT INTO `eventTables` VALUES (124, 1, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (125, 2, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (126, 3, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (127, 4, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (128, 5, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (129, 6, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (130, 7, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (131, 8, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (132, 9, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (133, 10, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (134, 11, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (135, 12, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (136, 13, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (137, 14, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (138, 15, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (139, 16, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (140, 17, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (141, 18, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (142, 19, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (143, 20, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (144, 21, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (145, 22, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (146, 23, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (147, 24, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (148, 25, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (149, 26, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (150, 27, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (151, 28, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (152, 29, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (153, 30, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (154, 31, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (155, 32, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (156, 33, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (157, 34, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (158, 35, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (159, 36, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (160, 37, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (161, 38, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (162, 39, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (163, 40, '2024-04-11', 8, NULL);
INSERT INTO `eventTables` VALUES (164, 1, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (165, 2, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (166, 3, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (167, 4, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (168, 5, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (169, 6, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (170, 7, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (171, 8, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (172, 9, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (173, 10, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (174, 11, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (175, 12, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (176, 13, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (177, 14, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (178, 15, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (179, 16, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (180, 17, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (181, 18, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (182, 19, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (183, 20, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (184, 21, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (185, 22, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (186, 23, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (187, 24, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (188, 25, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (189, 26, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (190, 27, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (191, 28, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (192, 29, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (193, 30, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (194, 31, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (195, 32, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (196, 33, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (197, 34, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (198, 35, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (199, 36, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (200, 37, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (201, 38, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (202, 39, '2024-04-12', 8, NULL);
INSERT INTO `eventTables` VALUES (203, 40, '2024-04-12', 8, NULL);
COMMIT;

-- ----------------------------
-- Table structure for system_status
-- ----------------------------
DROP TABLE IF EXISTS `system_status`;
CREATE TABLE `system_status` (
  `id` int(11) DEFAULT NULL,
  `hostessOpenDateTime` datetime DEFAULT NULL,
  `hostessCloseDateTime` datetime DEFAULT NULL,
  `generalOpenDateTime` datetime DEFAULT NULL,
  `generalCloseDateTime` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of system_status
-- ----------------------------
BEGIN;
INSERT INTO `system_status` VALUES (1, '2023-09-25 20:05:10', '2024-01-31 20:05:14', '2024-02-25 00:00:00', '2024-04-01 00:00:00');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
