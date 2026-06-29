-- AlterTable
ALTER TABLE `partners` ADD COLUMN `display_order` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `website` VARCHAR(512) NULL;

-- CreateTable
CREATE TABLE `nationality_translations` (
    `id` VARCHAR(36) NOT NULL,
    `nationality_id` VARCHAR(36) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `country_name` VARCHAR(128) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nationality_translations_nat_lang_unique`(`nationality_id`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `step_guidelines` (
    `id` VARCHAR(36) NOT NULL,
    `step_number` INTEGER NOT NULL,
    `icon` VARCHAR(64) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `step_guideline_translations` (
    `id` VARCHAR(36) NOT NULL,
    `step_guideline_id` VARCHAR(36) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `step_guideline_trans_step_lang_unique`(`step_guideline_id`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_rule_translations` (
    `id` VARCHAR(36) NOT NULL,
    `pricing_rule_id` VARCHAR(36) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `processing` VARCHAR(255) NULL,
    `features` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pricing_rule_trans_rule_lang_unique`(`pricing_rule_id`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `nationality_translations` ADD CONSTRAINT `nationality_translations_nationality_id_fkey` FOREIGN KEY (`nationality_id`) REFERENCES `nationalities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `step_guideline_translations` ADD CONSTRAINT `step_guideline_translations_step_guideline_id_fkey` FOREIGN KEY (`step_guideline_id`) REFERENCES `step_guidelines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricing_rule_translations` ADD CONSTRAINT `pricing_rule_translations_pricing_rule_id_fkey` FOREIGN KEY (`pricing_rule_id`) REFERENCES `pricing_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
