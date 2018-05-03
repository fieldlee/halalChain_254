DROP DATABASE IF EXISTS `explore`;
CREATE DATABASE `explore` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
GRANT ALL PRIVILEGES ON explore.* TO 'halalchain'@'localhost';
FLUSH PRIVILEGES;
USE `explore`;

CREATE TABLE IF NOT EXISTS `peer` (
`name` VARCHAR(50)  NOT NULL   COMMENT '',
`request` VARCHAR(50)  NOT NULL   COMMENT '',
`hostname` VARCHAR(50)  NOT NULL   COMMENT '',
`organization` VARCHAR(50)  NOT NULL   COMMENT '',
PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `db_version` (
`id` INT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '',
`version` INT UNSIGNED NOT NULL   COMMENT '',
`update_time` TIMESTAMP  NOT NULL   COMMENT '',
PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `block` (
`data_hash` VARCHAR(300)  NOT NULL   COMMENT '',
`number` INT UNSIGNED NOT NULL   COMMENT '',
`tx_count` INT UNSIGNED NOT NULL   COMMENT '',
`timestamp` BIGINT  NOT NULL   COMMENT '',
`previous_hash` VARCHAR(300)  NOT NULL   COMMENT '',
PRIMARY KEY (`data_hash`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;


INSERT INTO db_version(version, update_time) VALUES(1, utc_timestamp());
