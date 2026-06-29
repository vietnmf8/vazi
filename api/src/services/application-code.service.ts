import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/utils/errors";
import { getCalendarDateVN } from "@/validators/applications.validator";

const APPLICATION_CODE_SUFFIX_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const APPLICATION_CODE_RETRY_MAX = 10;

/** Pattern mã hồ sơ khách VN-YYYYMMDD-XXXXX */
export const APPLICATION_CODE_REGEX = /^VN-\d{8}-[A-Z0-9]{5}$/;

/**
 * Sinh 5 ký tự ngẫu nhiên A-Z0-9 — crypto-secure để tránh đoán mã đơn.
 */
function randomApplicationCodeSuffix(): string {
    let out = "";
    const n = APPLICATION_CODE_SUFFIX_CHARSET.length;
    for (let i = 0; i < 5; i++) {
        out += APPLICATION_CODE_SUFFIX_CHARSET[randomInt(0, n)]!;
    }
    return out;
}

/**
 * Candidate mã hồ sơ VN-YYYYMMDD-XXXXX theo ngày lịch VN.
 */
export function buildApplicationCodeCandidate(): string {
    const cal = getCalendarDateVN();
    const mm = String(cal.m).padStart(2, "0");
    const dd = String(cal.d).padStart(2, "0");
    const ymd = `${cal.y}${mm}${dd}`;
    return `VN-${ymd}-${randomApplicationCodeSuffix()}`;
}

/**
 * Sinh mã VN-… unique trong transaction.
 */
export async function generateUniqueApplicationCode(
    tx: Prisma.TransactionClient,
): Promise<string> {
    for (let attempt = 0; attempt < APPLICATION_CODE_RETRY_MAX; attempt++) {
        const candidate = buildApplicationCodeCandidate();
        const exists = await tx.visaApplication.findFirst({
            where: {
                OR: [{ applicationCode: candidate }, { id: candidate }],
            },
            select: { id: true },
        });
        if (!exists) {
            return candidate;
        }
    }
    throw new ConflictError("errors.application_code_generation_failed");
}

/**
 * Legacy: gán `applicationCode` cho đơn PENDING cũ khi thanh toán.
 */
export async function assignApplicationCodeOnPayment(
    tx: Prisma.TransactionClient,
    applicationId: string,
): Promise<string> {
    const app = await tx.visaApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, applicationCode: true },
    });
    if (!app) {
        throw new NotFoundError("errors.application_not_found");
    }
    if (app.applicationCode) {
        return app.applicationCode;
    }

    if (APPLICATION_CODE_REGEX.test(app.id)) {
        await tx.visaApplication.update({
            where: { id: applicationId },
            data: { applicationCode: app.id },
        });
        return app.id;
    }

    const code = await generateUniqueApplicationCode(tx);
    await tx.visaApplication.update({
        where: { id: applicationId },
        data: { applicationCode: code },
    });
    return code;
}
