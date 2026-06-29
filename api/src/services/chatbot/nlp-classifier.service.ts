import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export interface NlpClassifyResult {
  intent: string;
  score: number;
  actionPayload: {
    action: "VIRTUAL_CLICK" | "NAVIGATION" | "SCROLL_PAGE" | "NAVIGATE_AND_CLICK" | "VIRTUAL_SELECT";
    target?: string;
    destination?: string;
    mode?: "top" | "bottom" | "element";
    optionCode?: string;
  };
}

export class NLPClassifierService {
  private static instance: NLPClassifierService;
  private manager: any = null; // NlpManager — không có TS types
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private trainPromise: Promise<void> | null = null; // Mutex cho train()
  // Fix I1: Cache intents trong memory, invalidate sau train()
  private intentCache: Map<
    string,
    { actionPayload: any; isActive: boolean }
  > | null = null;

  static getInstance(): NLPClassifierService {
    if (!NLPClassifierService.instance) {
      NLPClassifierService.instance = new NLPClassifierService();
    }
    return NLPClassifierService.instance;
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Khởi tạo: load model từ đường dẫn trong DB, hoặc train từ đầu nếu chưa có.
   * Race-safe: nhiều caller gọi initialize() đồng thời chỉ chạy 1 lần.
   */
  async initialize(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      // Tìm model mới nhất trong DB
      const latest = await prisma.nlpModelMeta.findFirst({
        orderBy: { version: "desc" },
      });

      if (latest && fs.existsSync(latest.modelPath)) {
        // Load model từ file đã lưu
        const { NlpManager } = require("node-nlp");
        this.manager = new NlpManager({ languages: ["vi", "en"], autoSave: false });
        await this.manager.load(latest.modelPath);
        console.log(`[NLP] Loaded model v${latest.version} from ${latest.modelPath}`);

        // Fix I1: Populate intent cache sau khi load model từ file
        const intents = await prisma.nlpIntent.findMany({ where: { isActive: true } });
        this.intentCache = new Map(
          intents.map((i) => [i.name, { actionPayload: i.actionPayload, isActive: i.isActive }])
        );
      } else {
        // Chưa có model → train từ đầu
        console.log("[NLP] No model found — training from scratch...");
        await this.train();
      }

      this.ready = true;
    } catch (err) {
      console.error("[NLP] initialize failed:", err);
      // Fix C2: Reset initPromise để cho phép retry lần sau
      this.initPromise = null;
      // Không throw — classifier không hoạt động nhưng app vẫn chạy (fallback Gemini)
    }
  }

  /**
   * Train model từ tất cả utterances của intents đang active trong DB.
   * Lưu file JSON và ghi bản ghi NlpModelMeta mới.
   * Public để RetrainScheduler có thể gọi trực tiếp.
   * Race-safe: concurrent callers chờ cùng một promise, không train trùng lặp.
   */
  async train(): Promise<void> {
    if (this.trainPromise) return this.trainPromise;
    this.trainPromise = this._doTrain().finally(() => {
      this.trainPromise = null;
    });
    return this.trainPromise;
  }

  private async _doTrain(): Promise<void> {
    const { NlpManager } = require("node-nlp");
    const manager = new NlpManager({ languages: ["vi", "en"], autoSave: false });

    // Load utterances + intent liên quan từ DB
    const utterances = await prisma.nlpUtterance.findMany({
      include: { intent: true },
      where: { intent: { isActive: true } },
    });

    if (utterances.length === 0) {
      console.warn("[NLP] No utterances found — skipping train");
      return;
    }

    // Thêm dữ liệu training
    for (const u of utterances) {
      manager.addDocument(u.language, u.text, u.intent.name);
    }

    // Thêm answers (lưu actionPayload theo từng intent để manager có thể trả về)
    const intents = await prisma.nlpIntent.findMany({ where: { isActive: true } });
    for (const intent of intents) {
      manager.addAnswer("vi", intent.name, JSON.stringify(intent.actionPayload));
      manager.addAnswer("en", intent.name, JSON.stringify(intent.actionPayload));
    }

    console.log(
      `[NLP] Training with ${utterances.length} utterances, ${intents.length} intents...`,
    );
    await manager.train();

    // Xác định version tiếp theo
    const latest = await prisma.nlpModelMeta.findFirst({ orderBy: { version: "desc" } });
    const nextVersion = (latest?.version ?? 0) + 1;

    const modelDir = path.join(process.cwd(), "data", "nlp");
    fs.mkdirSync(modelDir, { recursive: true });
    const modelPath = path.join(modelDir, `model-v${nextVersion}.json`);

    // Fix C1: Ghi DB trước, save file sau — đảm bảo atomicity
    const meta = await prisma.nlpModelMeta.create({
      data: {
        version: nextVersion,
        modelPath,
        utteranceCount: utterances.length,
        intentCount: intents.length,
        trainedAt: new Date(),
      },
    });

    // Save file sau khi DB đã ghi thành công
    try {
      // Fix I3: pretty-print chỉ trong non-production
      const pretty = process.env.NODE_ENV !== "production";
      await manager.save(modelPath, pretty);
    } catch (saveErr) {
      // Compensating action: xóa DB record vừa tạo để tránh orphan metadata
      await prisma.nlpModelMeta.delete({ where: { id: meta.id } }).catch(() => {});
      throw saveErr;
    }

    // Đánh dấu các utterances đã được dùng trong training
    await prisma.nlpUtterance.updateMany({
      where: { intent: { isActive: true } },
      data: { usedInTraining: true },
    });

    // Fix I1: Populate intent cache sau train, invalidate cache cũ
    this.intentCache = new Map(
      intents.map((i) => [i.name, { actionPayload: i.actionPayload, isActive: i.isActive }])
    );

    // Cập nhật manager đang chạy
    this.manager = manager;
    this.ready = true;
    console.log(`[NLP] Training complete — model v${nextVersion} saved to ${modelPath}`);
  }

  /**
   * Classify text — trả về null nếu không nhận ra intent hoặc confidence < threshold.
   * @param lang Ngôn ngữ tường minh ("vi" | "en") — tránh auto-detect không reliable cho tiếng Việt ngắn
   */
  async classify(
    text: string,
    threshold = 0.95,
    lang?: "vi" | "en", // Fix I2: Thêm optional language param
  ): Promise<NlpClassifyResult | null> {
    if (!this.ready || !this.manager) return null;

    // Fix I2: Dùng lang tường minh nếu có, ngược lại auto-detect
    const result = await this.manager.process(lang ?? undefined, text);

    if (!result.intent || result.intent === "None" || result.score < threshold) {
      return null;
    }

    // Fix I1: Đọc từ cache thay vì query DB mỗi lần
    const cached = this.intentCache?.get(result.intent);
    if (!cached || !cached.isActive) return null;

    const actionPayload = cached.actionPayload as {
      action: "VIRTUAL_CLICK" | "NAVIGATION" | "SCROLL_PAGE" | "NAVIGATE_AND_CLICK";
      target?: string;
      destination?: string;
      mode?: "top" | "bottom" | "element";
    };

    return { intent: result.intent, score: result.score, actionPayload };
  }
}
