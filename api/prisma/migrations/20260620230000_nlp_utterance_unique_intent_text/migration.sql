-- Add unique constraint on (intent_id, text) to prevent duplicate utterances
ALTER TABLE `nlp_utterances` ADD UNIQUE INDEX `nlp_utterances_intent_id_text_key`(`intent_id`, `text`(255));
