-- DropForeignKey
ALTER TABLE `nlp_utterances` DROP FOREIGN KEY `nlp_utterances_intent_id_fkey`;

-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_category_id_fkey`;

-- DropIndex
DROP INDEX `nlp_utterances_intent_id_text_key` ON `nlp_utterances`;

-- AlterTable
ALTER TABLE `applicants` ADD COLUMN `flight_ticket_url` VARCHAR(512) NULL;

-- AlterTable
ALTER TABLE `application_drafts` ADD COLUMN `guest_id` VARCHAR(128) NULL;

-- AlterTable
ALTER TABLE `chat_messages` ADD COLUMN `documents` JSON NULL,
    ADD COLUMN `images` JSON NULL,
    ADD COLUMN `original_language` VARCHAR(10) NULL;

-- AlterTable
ALTER TABLE `chat_sessions` ADD COLUMN `context` JSON NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `status` ENUM('AI_HANDLING', 'HUMAN_HANDLING', 'CLOSED', 'CLOSED_BY_CLIENT') NOT NULL DEFAULT 'AI_HANDLING';

-- AlterTable
ALTER TABLE `eligibility_rules` ADD COLUMN `training_phrases` JSON NULL;

-- AlterTable
ALTER TABLE `faqs` ADD COLUMN `training_phrases` JSON NULL;

-- AlterTable
ALTER TABLE `nationalities` DROP COLUMN `is_eligible_evisa`,
    ADD COLUMN `group` ENUM('POPULAR', 'GOOD', 'NORMAL', 'BLACKLIST') NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN `sequence_no` INTEGER NOT NULL AUTO_INCREMENT UNIQUE;

-- AlterTable
ALTER TABLE `nlp_model_metas` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `nlp_utterances` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `ports` ADD COLUMN `sequence_no` INTEGER NOT NULL AUTO_INCREMENT UNIQUE;

-- AlterTable
ALTER TABLE `pricing_rules` ADD COLUMN `training_phrases` JSON NULL;

-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sequence_no` INTEGER NOT NULL AUTO_INCREMENT UNIQUE;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `account_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `avatar_url` VARCHAR(512) NULL,
    ADD COLUMN `email_verified_at` DATETIME(3) NULL,
    ADD COLUMN `reset_password_expires` DATETIME(3) NULL,
    ADD COLUMN `reset_password_token` VARCHAR(255) NULL,
    ADD COLUMN `sequence_no` INTEGER NOT NULL AUTO_INCREMENT UNIQUE,
    MODIFY `role` ENUM('ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE `visa_applications` ADD COLUMN `pickup_point_image_public_id` VARCHAR(512) NULL,
    ADD COLUMN `sequence_no` INTEGER NOT NULL AUTO_INCREMENT UNIQUE,
    MODIFY `status` ENUM('COMPLETED', 'PROCESSING', 'PAID', 'REJECTED', 'PENDING') NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE `visa_exemption_countries` ADD COLUMN `sequence_no` INTEGER NOT NULL AUTO_INCREMENT UNIQUE;

-- DropTable
DROP TABLE `post_categories`;

-- DropTable
DROP TABLE `posts`;

-- CreateTable
CREATE TABLE `newsletter_subscriptions` (
    `id` VARCHAR(36) NOT NULL,
    `sequence_no` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `subscribed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_campaign_sent_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `newsletter_subscriptions_sequence_no_key`(`sequence_no`),
    UNIQUE INDEX `newsletter_subscriptions_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` VARCHAR(36) NOT NULL,
    `content` TEXT NULL,
    `author_name` VARCHAR(100) NOT NULL,
    `author_email` VARCHAR(255) NOT NULL,
    `author_nationality` VARCHAR(2) NULL,
    `author_token` VARCHAR(64) NOT NULL,
    `parent_id` VARCHAR(36) NULL,
    `helpful_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `images` JSON NULL,
    `original_language` VARCHAR(10) NULL,
    `translated_content` TEXT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `comments_parent_id_idx`(`parent_id`),
    INDEX `comments_author_token_idx`(`author_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_settings` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `value` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `page_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `background_jobs` (
    `id` VARCHAR(36) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `error` TEXT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `background_jobs_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `newsletter_campaigns` (
    `id` VARCHAR(36) NOT NULL,
    `sequence_no` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(255) NOT NULL,
    `html_content` LONGTEXT NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `newsletter_campaigns_sequence_no_key`(`sequence_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reels` (
    `id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NULL,
    `author_name` VARCHAR(128) NOT NULL,
    `author_avatar` VARCHAR(512) NULL,
    `media` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reel_reactions` (
    `id` VARCHAR(36) NOT NULL,
    `reel_id` VARCHAR(36) NOT NULL,
    `emoji` VARCHAR(16) NOT NULL,
    `guest_id` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reel_reactions_reel_id_idx`(`reel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guest_sessions` (
    `id` VARCHAR(128) NOT NULL,
    `last_active` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `guest_sessions_last_active_idx`(`last_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `chat_sessions_deleted_at_idx` ON `chat_sessions`(`deleted_at`);

-- CreateIndex
CREATE UNIQUE INDEX `nationalities_sequence_no_key` ON `nationalities`(`sequence_no`);

-- CreateIndex
CREATE UNIQUE INDEX `nlp_utterances_intent_id_text_key` ON `nlp_utterances`(`intent_id`, `text`);

-- CreateIndex
CREATE UNIQUE INDEX `ports_sequence_no_key` ON `ports`(`sequence_no`);

-- CreateIndex
CREATE UNIQUE INDEX `reviews_sequence_no_key` ON `reviews`(`sequence_no`);

-- CreateIndex
CREATE INDEX `reviews_is_active_idx` ON `reviews`(`is_active`);

-- CreateIndex
CREATE UNIQUE INDEX `users_sequence_no_key` ON `users`(`sequence_no`);

-- CreateIndex
CREATE UNIQUE INDEX `visa_applications_sequence_no_key` ON `visa_applications`(`sequence_no`);

-- CreateIndex
CREATE INDEX `visa_applications_created_at_idx` ON `visa_applications`(`created_at`);

-- CreateIndex
CREATE INDEX `visa_applications_contact_email_idx` ON `visa_applications`(`contact_email`);

-- CreateIndex
CREATE INDEX `visa_applications_applicant_count_created_at_idx` ON `visa_applications`(`applicant_count`, `created_at`);

-- CreateIndex
CREATE INDEX `visa_applications_total_amount_created_at_idx` ON `visa_applications`(`total_amount`, `created_at`);

-- CreateIndex
CREATE UNIQUE INDEX `visa_exemption_countries_sequence_no_key` ON `visa_exemption_countries`(`sequence_no`);



-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reel_reactions` ADD CONSTRAINT `reel_reactions_reel_id_fkey` FOREIGN KEY (`reel_id`) REFERENCES `reels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `nlp_model_metas` RENAME INDEX `nlp_model_meta_version_key` TO `nlp_model_metas_version_key`;
