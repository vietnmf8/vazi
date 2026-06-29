-- Fix 1: Add updated_at to nlp_utterances
ALTER TABLE `nlp_utterances` ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Fix 2: Add updated_at to nlp_model_meta
ALTER TABLE `nlp_model_meta` ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Fix 3: Rename table nlp_model_meta -> nlp_model_metas
RENAME TABLE `nlp_model_meta` TO `nlp_model_metas`;

-- Fix 4: Add composite index language + used_in_training on nlp_utterances
CREATE INDEX `nlp_utterances_language_used_in_training_idx` ON `nlp_utterances`(`language`, `used_in_training`);

-- Fix 5: Add DEFAULT CURRENT_TIMESTAMP(3) to trained_at on nlp_model_metas
ALTER TABLE `nlp_model_metas` MODIFY COLUMN `trained_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
