import prisma from "@/lib/prisma";
import { NLPClassifierService } from "@/services/chatbot/nlp-classifier.service";

// Map path → intent name (navigate intents)
const PATH_TO_INTENT: Record<string, string> = {
    "/apply": "navigate.apply",
    "/contact-us": "navigate.contact",
    "/check-status": "navigate.check_status",
    "/": "navigate.home",
    "/guide/vietnam-visa-fees": "navigate.pricing",
};

// Map target → intent name (click intents)
const TARGET_TO_INTENT: Record<string, string> = {
    "hero_apply":                    "click.hero_apply",
    "hero_check_status":             "click.hero_check_status",
    "btn-apply-header":              "click.btn_apply_header",
    "header_check_status":           "click.header_check_status",
    "lang-selector":                 "click.lang_selector",
    "chat-toggle":                   "click.chat_toggle",
    "cta_apply":                     "click.cta_apply",
    "cta_check_status":              "click.cta_check_status",
    "continue_to_apply":             "click.continue_to_apply",
    "how_to_apply_start":            "click.how_to_apply_start",
    "check_status_submit":           "click.check_status_submit",
    "contact_submit":                "click.contact_submit",
    "emergency_submit":              "click.emergency_submit",
    "emergency_correction_whatsapp": "click.emergency_whatsapp",
    "faqs_submit_question":          "click.faqs_submit_question",
    "next_step2":                    "click.next_step2",
    "header_mobile_menu":            "click.header_mobile_menu",
};

// Số utterance user-learned (isSeeded: false) để trigger auto-retrain
const RETRAIN_THRESHOLD = 5;

export class LearningRecorderService {
    /**
     * Phân tích Gemini reply — nếu có navigate_to_page hoặc click_ui_element tool call,
     * ghi utterance vào DB làm training data.
     * Fire-and-forget: không throw ra ngoài.
     */
    static async recordFromStreamResult(
        userText: string,
        geminiReply: string,
    ): Promise<void> {
        try {
            // Extract system_log annotation
            const match = geminiReply.match(/<!--system_log:(\{.*?\})-->/);
            if (!match) return;

            let log: { tool: string; args: Record<string, string> };
            try {
                if (match[1].length > 512) return; // Tránh parse payload quá lớn
                log = JSON.parse(match[1]);
            } catch {
                return; // Malformed annotation
            }

            // Resolve intent name từ tool + args
            let intentName: string | undefined;
            if (log.tool === "navigate_to_page" && log.args?.path) {
                intentName = PATH_TO_INTENT[log.args.path];
            } else if (log.tool === "click_ui_element" && log.args?.target) {
                intentName = TARGET_TO_INTENT[log.args.target];
            }

            if (!intentName) return; // Tool/path/target không nằm trong scope

            const intent = await prisma.nlpIntent.findUnique({
                where: { name: intentName },
            });
            if (!intent || !intent.isActive) return;

            const text = userText.trim().slice(0, 512);
            if (!text) return;

            const language = detectLanguage(text);
            // Dùng upsert để tránh race condition giữa findFirst + create
            await prisma.nlpUtterance.upsert({
                where: { intentId_text: { intentId: intent.id, text } },
                create: { intentId: intent.id, text, language, isSeeded: false, usedInTraining: false },
                update: {}, // không cập nhật gì nếu đã tồn tại
            });

            console.log(
                `[NLP Learn] Ghi utterance: intent="${intentName}" lang=${language} | "${text.slice(0, 60)}"`
            );

            // Smart retrain trigger: đếm utterances user-learned chưa được train
            const pendingCount = await prisma.nlpUtterance.count({
                where: { usedInTraining: false, isSeeded: false },
            });

            if (pendingCount >= RETRAIN_THRESHOLD) {
                console.log(`[NLP Learn] Auto-retrain triggered: ${pendingCount} pending utterances`);
                void NLPClassifierService.getInstance().train().catch((e) =>
                    console.error("[NLP Learn] Auto-retrain failed:", e)
                );
            }
        } catch (err) {
            // Non-critical — không propagate, không block caller
            console.error("[NLP Learn] recordFromStreamResult error:", err);
        }
    }
}

/** Detect ngôn ngữ đơn giản dựa vào Unicode range tiếng Việt */
function detectLanguage(text: string): string {
    return /[àáâãèéêìíòóôõùúýăđơưÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]/.test(text)
        ? "vi"
        : "en";
}
