-- CreateTable
CREATE TABLE `visa_exemption_countries` (
    `id` VARCHAR(36) NOT NULL,
    `country_code` VARCHAR(8) NOT NULL,
    `exemption_days` INTEGER NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `visa_exemption_countries_country_code_key`(`country_code`),
    INDEX `visa_exemption_countries_is_active_display_order_idx`(`is_active`, `display_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
