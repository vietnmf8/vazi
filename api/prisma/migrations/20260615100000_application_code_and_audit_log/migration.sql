-- AlterTable: application_code + default cuid id
ALTER TABLE `visa_applications` ADD COLUMN `application_code` VARCHAR(64) NULL;

-- Backfill: paid+ legacy records where id is VN- format
UPDATE `visa_applications`
SET `application_code` = `id`
WHERE `id` REGEXP '^VN-[0-9]{8}-[A-Z0-9]{5}$'
  AND `status` <> 'PENDING';

CREATE UNIQUE INDEX `visa_applications_application_code_key` ON `visa_applications`(`application_code`);
CREATE INDEX `visa_applications_application_code_idx` ON `visa_applications`(`application_code`);

-- CreateTable: audit logs
CREATE TABLE `visa_application_audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `application_id` VARCHAR(64) NOT NULL,
    `admin_user_id` VARCHAR(36) NOT NULL,
    `action` VARCHAR(32) NOT NULL,
    `changed_fields` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `visa_application_audit_logs_application_id_idx`(`application_id`),
    INDEX `visa_application_audit_logs_admin_user_id_idx`(`admin_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `visa_application_audit_logs` ADD CONSTRAINT `visa_application_audit_logs_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `visa_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `visa_application_audit_logs` ADD CONSTRAINT `visa_application_audit_logs_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
