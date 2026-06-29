-- AlterTable
ALTER TABLE `articles` ADD COLUMN `metadata` JSON NULL;

-- CreateTable
CREATE TABLE `eligibility_rules` (
    `id` VARCHAR(36) NOT NULL,
    `country_code` VARCHAR(2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `eligibility_rules_country_code_key`(`country_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eligibility_rule_translations` (
    `id` VARCHAR(36) NOT NULL,
    `eligibility_rule_id` VARCHAR(36) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `status` VARCHAR(255) NOT NULL,
    `stay` VARCHAR(255) NOT NULL,
    `fee` VARCHAR(255) NOT NULL,
    `processing` VARCHAR(255) NOT NULL,
    `requirements` JSON NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `elig_rule_trans_rule_lang_unique`(`eligibility_rule_id`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `eligibility_rule_translations` ADD CONSTRAINT `eligibility_rule_translations_eligibility_rule_id_fkey` FOREIGN KEY (`eligibility_rule_id`) REFERENCES `eligibility_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
