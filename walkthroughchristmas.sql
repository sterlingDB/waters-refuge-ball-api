/*
 Navicat MySQL Data Transfer

 Source Server         : Do - WTC
 Source Server Type    : MySQL
 Source Server Version : 80028
 Source Host           : wtc-do-user-434273-0.b.db.ondigitalocean.com:25060
 Source Schema         : walkthroughchristmas

 Target Server Type    : MySQL
 Target Server Version : 80028
 File Encoding         : 65001

 Date: 06/12/2022 20:04:36
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for reservations
-- ----------------------------
DROP TABLE IF EXISTS `reservations`;
CREATE TABLE "reservations" (
  "id" int NOT NULL AUTO_INCREMENT,
  "uuid" varchar(255) DEFAULT NULL,
  "slot_id" int DEFAULT NULL,
  "name" varchar(255) DEFAULT NULL,
  "cast_member_name" varchar(255) DEFAULT NULL,
  "phone" varchar(255) DEFAULT NULL,
  "email" varchar(255) DEFAULT NULL,
  "date_slot" date NOT NULL,
  "time_slot" time NOT NULL,
  "adult_seats" int NOT NULL DEFAULT '0',
  "child_seats" int NOT NULL DEFAULT '0',
  "reserved_seats" int NOT NULL,
  "released_seats" int DEFAULT '0',
  "reservation_complete" tinyint(1) NOT NULL DEFAULT '0',
  "reservation_email_sent" tinyint(1) NOT NULL DEFAULT '0',
  "confirmation_email_sent" tinyint(1) NOT NULL DEFAULT '0',
  "created_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "modified_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "reservation_text_sent" tinyint(1) DEFAULT '0',
  "confirmation_text_sent" tinyint(1) DEFAULT '0',
  "is_deleted" tinyint DEFAULT '0',
  "deleted_at" datetime DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "date" ("date_slot","time_slot"),
  KEY "reservationComplete" ("reservation_complete"),
  KEY "dateTimeCreated" ("created_at")
);

-- ----------------------------
-- Table structure for system_status
-- ----------------------------
DROP TABLE IF EXISTS `system_status`;
CREATE TABLE "system_status" (
  "id" int NOT NULL,
  "reg" int DEFAULT NULL,
  "waitlist" int DEFAULT NULL,
  "cast" int DEFAULT NULL,
  "full" int DEFAULT NULL,
  "castOpenDateTime" datetime DEFAULT NULL,
  "castCloseDateTime" datetime DEFAULT NULL,
  "openDateTime" datetime DEFAULT NULL,
  "closeDateTime" datetime DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- ----------------------------
-- Records of system_status
-- ----------------------------
BEGIN;
INSERT INTO `system_status` VALUES (1, 0, 0, 0, 1, '2022-10-30 12:00:00', '2022-11-02 12:00:00', '2022-11-21 07:00:00', '2022-11-30 00:00:00');
COMMIT;

-- ----------------------------
-- Table structure for timeslots
-- ----------------------------
DROP TABLE IF EXISTS `timeslots`;
CREATE TABLE "timeslots" (
  "id" int NOT NULL AUTO_INCREMENT,
  "date_slot" date NOT NULL,
  "time_slot" time NOT NULL,
  "available_seats" int NOT NULL,
  "modified_at" datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  "showAfter" datetime DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "date" ("date_slot"),
  KEY "timeslot" ("time_slot"),
  KEY "date_2" ("date_slot","time_slot")
);

-- ----------------------------
-- Records of timeslots
-- ----------------------------
BEGIN;
INSERT INTO `timeslots` VALUES (129, '2022-12-01', '17:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (130, '2022-12-01', '17:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (131, '2022-12-01', '17:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (132, '2022-12-01', '18:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (133, '2022-12-01', '18:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (134, '2022-12-01', '18:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (135, '2022-12-01', '19:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (136, '2022-12-01', '19:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (137, '2022-12-01', '19:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (138, '2022-12-01', '20:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (139, '2022-12-01', '20:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (140, '2022-12-01', '20:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (141, '2022-12-02', '17:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (142, '2022-12-02', '17:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (143, '2022-12-02', '17:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (144, '2022-12-02', '18:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (145, '2022-12-02', '18:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (146, '2022-12-02', '18:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (147, '2022-12-02', '19:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (148, '2022-12-02', '19:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (149, '2022-12-02', '19:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (150, '2022-12-02', '20:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (151, '2022-12-02', '20:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (152, '2022-12-02', '20:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (153, '2022-12-03', '17:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (154, '2022-12-03', '17:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (155, '2022-12-03', '17:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (156, '2022-12-03', '18:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (157, '2022-12-03', '18:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (158, '2022-12-03', '18:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (159, '2022-12-03', '19:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (160, '2022-12-03', '19:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (161, '2022-12-03', '19:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (162, '2022-12-03', '20:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (163, '2022-12-03', '20:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (164, '2022-12-03', '20:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (165, '2022-12-04', '17:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (166, '2022-12-04', '17:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (167, '2022-12-04', '17:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (168, '2022-12-04', '18:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (169, '2022-12-04', '18:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (170, '2022-12-04', '18:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (171, '2022-12-04', '19:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (172, '2022-12-04', '19:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (173, '2022-12-04', '19:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (174, '2022-12-04', '20:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (175, '2022-12-04', '20:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (176, '2022-12-04', '20:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (177, '2022-11-30', '17:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (178, '2022-11-30', '17:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (179, '2022-11-30', '17:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (180, '2022-11-30', '18:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (181, '2022-11-30', '18:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (182, '2022-11-30', '18:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (183, '2022-11-30', '19:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (184, '2022-11-30', '19:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (185, '2022-11-30', '19:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (186, '2022-11-30', '20:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (187, '2022-11-30', '20:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (188, '2022-11-30', '20:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (189, '2022-12-03', '21:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (190, '2022-12-03', '21:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (191, '2022-12-03', '21:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (192, '2022-12-04', '21:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (193, '2022-12-04', '21:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (194, '2022-12-04', '21:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (195, '2022-11-30', '16:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (196, '2022-11-30', '21:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (197, '2022-11-30', '21:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (199, '2022-12-01', '16:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (200, '2022-12-02', '16:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (201, '2022-12-03', '16:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (202, '2022-12-04', '16:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (203, '2022-12-01', '21:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (204, '2022-12-01', '21:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (205, '2022-12-01', '21:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (206, '2022-12-02', '21:00:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (207, '2022-12-02', '21:20:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (208, '2022-12-02', '21:40:00', 40, '2022-11-21 12:36:51', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (2008, '2022-11-30', '21:40:00', 40, '2022-11-21 12:36:32', '2022-12-08 22:00:00');
INSERT INTO `timeslots` VALUES (2009, '2022-11-28', '17:40:00', 40, NULL, '2022-11-21 07:00:00');
INSERT INTO `timeslots` VALUES (2010, '2022-11-28', '18:00:00', 40, NULL, '2022-11-21 07:00:00');
INSERT INTO `timeslots` VALUES (2011, '2022-11-28', '18:20:00', 40, NULL, '2022-11-21 07:00:00');
INSERT INTO `timeslots` VALUES (2012, '2022-11-28', '18:40:00', 40, NULL, '2022-11-21 07:00:00');
INSERT INTO `timeslots` VALUES (2013, '2022-11-28', '19:00:00', 40, NULL, '2022-11-21 07:00:00');
INSERT INTO `timeslots` VALUES (2014, '2022-11-28', '19:20:00', 40, NULL, '2022-11-21 07:00:00');
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE "users" (
  "id" int NOT NULL AUTO_INCREMENT,
  "username" varchar(255) CHARACTER SET utf16 COLLATE utf16_general_ci DEFAULT NULL,
  "password" varchar(255) CHARACTER SET utf16 COLLATE utf16_general_ci DEFAULT NULL,
  "auth" varchar(255) CHARACTER SET utf16 COLLATE utf16_general_ci DEFAULT NULL,
  "fullName" varchar(255) CHARACTER SET utf16 COLLATE utf16_general_ci DEFAULT NULL,
  "email" varchar(255) CHARACTER SET utf16 COLLATE utf16_general_ci DEFAULT NULL,
  "created" datetime DEFAULT NULL,
  "modified" datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO `users` VALUES (1002, 'grinch', 'vjVduKIz+U47h7aGvrQ0ggAhbk8=', 'admin', 'Church Lady', NULL, '2022-11-15 10:03:11', '2022-11-15 17:34:17');
COMMIT;

-- ----------------------------
-- Table structure for waitlists
-- ----------------------------
DROP TABLE IF EXISTS `waitlists`;
CREATE TABLE "waitlists" (
  "id" int NOT NULL AUTO_INCREMENT,
  "uuid" varchar(36) DEFAULT NULL,
  "name" varchar(255) DEFAULT NULL,
  "email" varchar(255) DEFAULT NULL,
  "phone" varchar(255) DEFAULT NULL,
  "date_slot" date NOT NULL,
  "seats" int NOT NULL,
  "adult_seats" int NOT NULL,
  "child_seats" int NOT NULL,
  "seats_given" int DEFAULT '0',
  "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "is_deleted" tinyint DEFAULT '0',
  "deleted_at" datetime DEFAULT NULL,
  PRIMARY KEY ("id")
);

SET FOREIGN_KEY_CHECKS = 1;
