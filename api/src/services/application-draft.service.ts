import { Prisma, PurposeOfVisit, VisaType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/utils/errors";
import { calculatePriceFromRules } from "@/services/application-pricing.service";
import type { CalculatePriceDto, SubmitApplicationDto } from "@/validators/applications.validator";
import { parseISODateOnlyToUtcStart } from "@/validators/applications.validator";

/** TTL nháp đơn — đủ thời gian magic link + abandoned cart */
const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

export type SubmitApplicationResult = {
    draft_id: string;
    total_amount: number;
};

/**
 * Lưu nháp đơn apply trước PayPal — không tạo `VisaApplication`.
 *
 * @throws {NotFoundError} Port không tồn tại / inactive
 * @throws {ForbiddenError} E_VISA nhưng quốc tịch không đủ điều kiện
 */
export async function createApplicationDraft(
    dto: SubmitApplicationDto,
    options?: { userId?: string },
): Promise<SubmitApplicationResult> {
    const portCode = dto.port_of_entry.trim().toUpperCase();
    const port = await prisma.port.findFirst({
        where: { code: portCode, isActive: true },
    });
    if (!port) {
        throw new NotFoundError("errors.port_not_found");
    }

    if (dto.visa_type === "E_VISA") {
        const codes = [...new Set(dto.applicants.map((a) => a.nationality))];
        const rows = await prisma.nationality.findMany({
            where: { countryCode: { in: codes } },
        });
        const byCode = new Map(rows.map((r) => [r.countryCode, r]));
        for (const code of codes) {
            const row = byCode.get(code);
            if (!row) {
                throw new Error(`Invalid nationality: ${code}`);
            }
        }
    }

    const pricingInput: CalculatePriceDto = {
        visa_type: dto.visa_type,
        visa_category: dto.visa_category,
        applicant_count: dto.applicant_count,
        processing_time: dto.processing_time,
        extra_services: dto.extra_services,
    };
    const pricing = await calculatePriceFromRules(pricingInput);

    const expiresAt = new Date(Date.now() + DRAFT_TTL_MS);

    const created = await prisma.applicationDraft.create({
        data: {
            userId: options?.userId ?? null,
            portId: port.id,
            contactEmail: dto.contact_email,
            contactPhone: dto.contact_phone,
            visaType: dto.visa_type as VisaType,
            visaCategory: dto.visa_category,
            purposeOfVisit: dto.purpose_of_visit as PurposeOfVisit,
            arrivalDate: parseISODateOnlyToUtcStart(dto.arrival_date),
            processingTime: dto.processing_time,
            extraServices: {
                ...((dto.extra_services as any) || {}),
                language: dto.language || "vi",
            } as Prisma.InputJsonValue,
            applicantCount: dto.applicant_count,
            totalAmount: new Prisma.Decimal(pricing.grand_total.toFixed(2)),
            applicantsPayload: dto.applicants as Prisma.InputJsonValue,
            expiresAt,
        },
        select: { id: true },
    });

    return {
        draft_id: created.id,
        total_amount: pricing.grand_total,
    };
}

/**
 * Lấy draft còn hiệu lực để thanh toán hoặc capture.
 *
 * @throws {NotFoundError} Không tìm thấy hoặc đã hết hạn
 */
export async function getPayableApplicationDraft(draftId: string) {
    const draft = await prisma.applicationDraft.findUnique({
        where: { id: draftId },
        select: {
            id: true,
            totalAmount: true,
            expiresAt: true,
            contactEmail: true,
            contactPhone: true,
            userId: true,
            portId: true,
            visaType: true,
            visaCategory: true,
            purposeOfVisit: true,
            arrivalDate: true,
            processingTime: true,
            extraServices: true,
            applicantCount: true,
            applicantsPayload: true,
        },
    });
    if (!draft || draft.expiresAt.getTime() <= Date.now()) {
        throw new NotFoundError("payments.draft_not_found");
    }
    return draft;
}
