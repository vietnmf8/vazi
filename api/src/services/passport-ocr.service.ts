import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/configs/env.config";
import { httpCodes } from "@/configs/constants";
import { AppError } from "@/utils/errors";

const GEMINI_MODEL = "gemini-flash-lite-latest";

const OCR_PROMPT = `You are a passport OCR specialist. Extract fields from this passport image.
Return ONLY a valid JSON object — no markdown, no code blocks, no explanation.
Use null for any field you cannot read clearly from the image.

{
  "full_name": "SURNAME GIVENNAMES in uppercase exactly as printed on passport",
  "gender": "male or female in lowercase",
  "nationality_name": "country name in English (e.g. Philippines, United States, Vietnam)",
  "date_of_birth": "YYYY-MM-DD",
  "passport_number": "exact alphanumeric string as printed",
  "passport_expiry_date": "YYYY-MM-DD",
  "mrz_line1": "first MRZ line verbatim (the machine-readable zone at bottom) or null",
  "mrz_line2": "second MRZ line verbatim or null"
}`;

export interface GeminiRawResult {
    full_name: string | null;
    gender: string | null;
    nationality_name: string | null;
    date_of_birth: string | null;
    passport_number: string | null;
    passport_expiry_date: string | null;
    mrz_line1: string | null;
    mrz_line2: string | null;
}

export type ConfidenceLevel = "high" | "low";

export interface ConfidenceMap {
    full_name: ConfidenceLevel;
    gender: ConfidenceLevel;
    nationality: ConfidenceLevel;
    date_of_birth: ConfidenceLevel;
    passport_number: ConfidenceLevel;
    passport_expiry_date: ConfidenceLevel;
}

export interface PassportExtractResult {
    fields: {
        full_name: string | null;
        gender: "male" | "female" | null;
        nationality_name: string | null;
        date_of_birth: string | null;
        passport_number: string | null;
        passport_expiry_date: string | null;
    };
    confidence: ConfidenceMap;
}

/** ISO date "YYYY-MM-DD" → MRZ 6-digit "YYMMDD" để so sánh trực tiếp với parsed.fields */
function toMrzDate(isoDate: string): string {
    const [yyyy, mm, dd] = isoDate.split("-");
    return `${yyyy!.slice(2)}${mm}${dd}`;
}

function normalizeDocNumber(s: string): string {
    return s.replace(/</g, "").toUpperCase().trim();
}

const DEFAULT_CONFIDENCE: ConfidenceMap = {
    full_name: "high",
    gender: "high",
    nationality: "high",
    date_of_birth: "high",
    passport_number: "high",
    passport_expiry_date: "high",
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Cross-validate AI output với MRZ checksum. Pure function — testable mà không cần Gemini.
 *
 * Logic: tin AI mặc định ("high"). Chỉ xuống "low" nếu MRZ parse thành công, checksum hợp lệ,
 * VÀ giá trị MRZ mâu thuẫn với AI — tức là MRZ chứng minh AI sai.
 */
export async function scoreConfidence(aiResult: GeminiRawResult): Promise<ConfidenceMap> {
    const { mrz_line1, mrz_line2 } = aiResult;
    if (!mrz_line1 || !mrz_line2) return { ...DEFAULT_CONFIDENCE };

    try {
        const { parse } = await import("mrz");
        const parsed = parse([mrz_line1, mrz_line2]);
        if (!parsed.valid) return { ...DEFAULT_CONFIDENCE };

        const confidence: ConfidenceMap = { ...DEFAULT_CONFIDENCE };

        if (aiResult.passport_number && parsed.fields.documentNumber) {
            if (normalizeDocNumber(parsed.fields.documentNumber) !== normalizeDocNumber(aiResult.passport_number)) {
                confidence.passport_number = "low";
            }
        }

        if (aiResult.date_of_birth && ISO_DATE_RE.test(aiResult.date_of_birth) && parsed.fields.birthDate) {
            if (toMrzDate(aiResult.date_of_birth) !== parsed.fields.birthDate) {
                confidence.date_of_birth = "low";
            }
        }

        if (aiResult.passport_expiry_date && ISO_DATE_RE.test(aiResult.passport_expiry_date) && parsed.fields.expirationDate) {
            if (toMrzDate(aiResult.passport_expiry_date) !== parsed.fields.expirationDate) {
                confidence.passport_expiry_date = "low";
            }
        }

        return confidence;
    } catch {
        return { ...DEFAULT_CONFIDENCE };
    }
}

/**
 * Gọi Gemini 2.5 Flash Vision với image base64, trả về fields + confidence.
 * Nhận image_data thay vì URL vì ImageUploadZone trả blob: URL (chỉ browser đọc được).
 */
export async function extractPassportData(
    imageBuffer: Buffer,
    mimeType: string,
): Promise<PassportExtractResult> {
    const imageBase64 = imageBuffer.toString("base64");
    const apiKey = getEnv().GEMINI_API_KEY.trim();
    if (!apiKey) {
        throw new AppError(
            "passport_ocr.gemini_not_configured",
            httpCodes.serviceUnavailable,
            "GEMINI_NOT_CONFIGURED",
        );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
            responseMimeType: "application/json",
        },
    });

    let result: Awaited<ReturnType<typeof model.generateContent>>;
    try {
        result = await model.generateContent([
            OCR_PROMPT,
            { inlineData: { data: imageBase64, mimeType } },
        ]);
    } catch (error) {
        console.error("[Gemini OCR Error]:", error);
        throw new AppError(
            "passport_ocr.gemini_call_failed",
            httpCodes.badGateway,
            "GEMINI_CALL_FAILED",
        );
    }

    const rawText = result.response.text().trim();
    const jsonText = rawText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");

    let parsed: GeminiRawResult;
    try {
        parsed = JSON.parse(jsonText) as GeminiRawResult;
    } catch {
        throw new AppError(
            "passport_ocr.parse_failed",
            httpCodes.unprocessableEntity,
            "OCR_PARSE_FAILED",
        );
    }

    const allFieldsNull =
        parsed.full_name === null &&
        parsed.gender === null &&
        parsed.nationality_name === null &&
        parsed.date_of_birth === null &&
        parsed.passport_number === null &&
        parsed.passport_expiry_date === null;

    if (allFieldsNull) {
        throw new AppError(
            "passport_ocr.not_a_passport",
            httpCodes.unprocessableEntity,
            "NOT_A_PASSPORT",
        );
    }

    const gender =
        parsed.gender === "male" || parsed.gender === "female"
            ? parsed.gender
            : null;

    const confidence = await scoreConfidence(parsed);

    return {
        fields: {
            full_name: parsed.full_name ?? null,
            gender,
            nationality_name: parsed.nationality_name ?? null,
            date_of_birth: parsed.date_of_birth ?? null,
            passport_number: parsed.passport_number ?? null,
            passport_expiry_date: parsed.passport_expiry_date ?? null,
        },
        confidence,
    };
}
