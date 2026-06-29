import type { Request, Response } from "express";

import prisma from "@/lib/prisma";
import { NLPClassifierService } from "@/services/chatbot/nlp-classifier.service";

// GET /api/v1/admin/nlp-cache/stats
export async function getNlpCacheStats(_req: Request, res: Response): Promise<void> {
    // Model mới nhất
    const latestModel = await prisma.nlpModelMeta.findFirst({ orderBy: { version: "desc" } });

    // Số utterance chưa được dùng để train
    const pendingCount = await prisma.nlpUtterance.count({ where: { usedInTraining: false } });

    // Danh sách intent kèm tổng số utterance
    const intents = await prisma.nlpIntent.findMany({
        include: {
            _count: { select: { utterances: true } },
        },
        orderBy: { name: "asc" },
    });

    // Số utterance pending theo từng intent
    const pendingPerIntent = await prisma.nlpUtterance.groupBy({
        by: ["intentId"],
        where: { usedInTraining: false },
        _count: { id: true },
    });
    const pendingMap = new Map(
        pendingPerIntent.map((p: { intentId: string; _count: { id: number } }) => [
            p.intentId,
            p._count.id,
        ]),
    );

    const intentStats = intents.map((intent: (typeof intents)[number]) => ({
        name: intent.name,
        actionPayload: intent.actionPayload,
        utteranceCount: intent._count.utterances,
        pendingCount: pendingMap.get(intent.id) ?? 0,
    }));

    res.success({
        model: latestModel
            ? {
                  version: latestModel.version,
                  trainedAt: latestModel.trainedAt,
                  utteranceCount: latestModel.utteranceCount,
                  intentCount: latestModel.intentCount,
              }
            : null,
        pending: {
            newUtterances: pendingCount,
            readyToRetrain: pendingCount >= 20,
        },
        intents: intentStats,
    });
}

// POST /api/v1/admin/nlp-cache/retrain
export async function triggerRetrain(_req: Request, res: Response): Promise<void> {
    const classifier = NLPClassifierService.getInstance();

    // initialize() là no-op nếu đã khởi tạo rồi
    await classifier.initialize();
    await classifier.train();

    const latestModel = await prisma.nlpModelMeta.findFirst({ orderBy: { version: "desc" } });

    res.success({
        ok: true,
        message: "Retrain triggered successfully",
        newVersion: latestModel?.version ?? null,
    });
}
