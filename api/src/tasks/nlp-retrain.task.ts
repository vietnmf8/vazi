import prisma from "@/lib/prisma";
import { NLPClassifierService } from "@/services/chatbot/nlp-classifier.service";

const MIN_NEW_EXAMPLES = 5;

export async function runNlpRetrainTask(): Promise<void> {
    const newCount = await prisma.nlpUtterance.count({
        where: { usedInTraining: false },
    });

    console.info(`[nlp-retrain] ${newCount} utterances mới chưa được train.`);

    if (newCount < MIN_NEW_EXAMPLES) {
        console.info(
            `[nlp-retrain] Chưa đủ 5 examples — bỏ qua lần này.`,
        );
        return;
    }

    console.info("[nlp-retrain] Đủ examples, bắt đầu retrain model...");
    const classifier = NLPClassifierService.getInstance();
    await classifier.initialize(); // Đảm bảo singleton đã init (no-op nếu đã chạy)
    await classifier.train();
    console.info("[nlp-retrain] Retrain hoàn tất.");
}
