-- Pay-first flow: draft before payment, application only after PayPal capture

CREATE TABLE `application_drafts` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `port_id` VARCHAR(36) NOT NULL,
    `contact_email` VARCHAR(191) NOT NULL,
    `contact_phone` VARCHAR(64) NOT NULL,
    `visa_type` ENUM('E_VISA', 'VOA') NOT NULL,
    `visa_category` VARCHAR(64) NOT NULL,
    `purpose_of_visit` ENUM('TOURIST', 'BUSINESS', 'OTHER') NOT NULL,
    `arrival_date` DATE NOT NULL,
    `processing_time` VARCHAR(64) NOT NULL,
    `extra_services` JSON NULL,
    `applicant_count` INTEGER NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `applicants_payload` JSON NOT NULL,
    `abandoned_email_sent` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `application_drafts_expires_at_idx`(`expires_at`),
    INDEX `application_drafts_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `application_drafts` ADD CONSTRAINT `application_drafts_port_id_fkey` FOREIGN KEY (`port_id`) REFERENCES `ports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `application_drafts` ADD CONSTRAINT `application_drafts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Hồ sơ mới mặc định PAID; bỏ cờ abandoned trên đơn đã thanh toán
ALTER TABLE `visa_applications` MODIFY `status` ENUM('PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PAID';
ALTER TABLE `visa_applications` DROP COLUMN `abandoned_email_sent`;
