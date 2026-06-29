-- CreateTable: nlp_intents — Intent NLP cho chatbot
CREATE TABLE `nlp_intents` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `action_payload` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nlp_intents_name_key`(`name`),
    INDEX `nlp_intents_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: nlp_utterances — Câu mẫu huấn luyện NLP
CREATE TABLE `nlp_utterances` (
    `id` VARCHAR(36) NOT NULL,
    `intent_id` VARCHAR(36) NOT NULL,
    `text` VARCHAR(512) NOT NULL,
    `language` VARCHAR(8) NOT NULL DEFAULT 'vi',
    `is_seeded` BOOLEAN NOT NULL DEFAULT false,
    `used_in_training` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `nlp_utterances_intent_id_used_in_training_idx`(`intent_id`, `used_in_training`),
    INDEX `nlp_utterances_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: nlp_model_meta — Metadata version model NLP đã train
CREATE TABLE `nlp_model_meta` (
    `id` VARCHAR(36) NOT NULL,
    `version` INTEGER NOT NULL AUTO_INCREMENT,
    `model_path` VARCHAR(512) NOT NULL,
    `utterance_count` INTEGER NOT NULL,
    `intent_count` INTEGER NOT NULL,
    `trained_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `nlp_model_meta_version_key`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: nlp_utterances.intent_id -> nlp_intents.id (Cascade delete)
ALTER TABLE `nlp_utterances` ADD CONSTRAINT `nlp_utterances_intent_id_fkey`
    FOREIGN KEY (`intent_id`) REFERENCES `nlp_intents`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
