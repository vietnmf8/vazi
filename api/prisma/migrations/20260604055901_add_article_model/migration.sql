-- AlterTable
ALTER TABLE `chat_messages` ADD COLUMN `reactions` JSON NULL;

-- CreateTable
CREATE TABLE `articles` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `subtitle` VARCHAR(512) NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(128) NULL,
    `type` VARCHAR(64) NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `articles_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
