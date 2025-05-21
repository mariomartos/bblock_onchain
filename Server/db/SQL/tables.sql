-- Crear la tabla logs
CREATE TABLE `logs` (
  `id` CHAR(36) NOT NULL,
  `created_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `chain` VARCHAR(20) NOT NULL,
  `token_address` VARCHAR(100) NOT NULL,
  `date_from` DATETIME NOT NULL,
  `date_to` DATETIME NOT NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `swaps` (
  `id` CHAR(36) NOT NULL,
  `log_id` CHAR(36) NOT NULL,
  `txs_hash` VARCHAR(255) NOT NULL,
  `txs_type` TINYINT(1) NOT NULL CHECK (txs_type IN (0, 1)),  -- BUY 1 / SELL 0
  `block_timestamp` DATETIME NOT NULL,
  `sub_category` TINYINT(4) DEFAULT NULL CHECK (sub_category IN (0, 1, 2, 3)), -- e.g., 0: newPosition, 1: Accumulation, etc.
  `wallet_address` VARCHAR(128) NOT NULL,
  `pair_address` VARCHAR(255) DEFAULT NULL,
  `token_address` VARCHAR(255) DEFAULT NULL,
  `token_amount` DECIMAL(38,18) DEFAULT NULL,
  `usd_amount` DOUBLE DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
