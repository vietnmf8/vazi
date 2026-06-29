-- AlterTable
ALTER TABLE `articles` ADD COLUMN `display_order` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `article_translations` (
    `id` VARCHAR(36) NOT NULL,
    `article_id` VARCHAR(36) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `subtitle` VARCHAR(512) NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `article_translations_art_lang_unique`(`article_id`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq_translations` (
    `id` VARCHAR(36) NOT NULL,
    `faq_id` VARCHAR(36) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `question` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `faq_translations_faq_lang_unique`(`faq_id`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `article_translations` ADD CONSTRAINT `article_translations_article_id_fkey` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faq_translations` ADD CONSTRAINT `faq_translations_faq_id_fkey` FOREIGN KEY (`faq_id`) REFERENCES `faqs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
