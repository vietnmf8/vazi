/*
  Warnings:

  - Added the required column `guest_name` to the `chat_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `chat_messages` ADD COLUMN `delivery_status` ENUM('SENT', 'DELIVERED', 'SEEN') NOT NULL DEFAULT 'SENT',
    ADD COLUMN `file_name` VARCHAR(255) NULL,
    ADD COLUMN `file_url` VARCHAR(512) NULL,
    ADD COLUMN `message_type` ENUM('TEXT', 'FILE', 'IMAGE', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    ADD COLUMN `reply_to_id` VARCHAR(36) NULL,
    ADD COLUMN `revoked_at` DATETIME(3) NULL,
    MODIFY `sender_type` ENUM('BOT', 'CUSTOMER', 'ADMIN', 'SYSTEM') NOT NULL;

-- AlterTable
ALTER TABLE `chat_sessions` ADD COLUMN `closed_at` DATETIME(3) NULL,
    ADD COLUMN `guest_name` VARCHAR(120) NOT NULL,
    ADD COLUMN `nationality` VARCHAR(64) NULL,
    ADD COLUMN `visa_interest` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `chat_surveys` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `chat_surveys_session_id_key`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_reply_to_id_fkey` FOREIGN KEY (`reply_to_id`) REFERENCES `chat_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_surveys` ADD CONSTRAINT `chat_surveys_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
