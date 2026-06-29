import { Prisma, PurposeOfVisit, VisaApplicationStatus, VisaType } from "@prisma/client";

import { ConflictError } from "@/utils/errors";
import { APPLICATION_CODE_REGEX } from "@/services/application-code.service";
import { generateUniqueApplicationCode } from "@/services/application-code.service";

export type DraftApplicantPayload = {
    full_name: string;
    gender: string;
    nationality: string;
    date_of_birth: string;
    passport_number: string;
    passport_expiry_date: string;
    passport_image_url: string;
    portrait_image_url?: string | null;
    /** URL vé máy bay — lưu từ draft sau khi thanh toán thành công */
    flight_ticket_url?: string | null;
};

type DraftRow = {
    id: string;
    userId: string | null;
    portId: string;
    contactEmail: string;
    contactPhone: string;
    visaType: VisaType;
    visaCategory: string;
    purposeOfVisit: PurposeOfVisit;
    arrivalDate: Date;
    processingTime: string;
    extraServices: Prisma.JsonValue;
    applicantCount: number;
    totalAmount: Prisma.Decimal;
    applicantsPayload: Prisma.JsonValue;
};

function parseApplicantsPayload(raw: Prisma.JsonValue): DraftApplicantPayload[] {
    if (!Array.isArray(raw)) {
        throw new ConflictError("payments.draft_invalid");
    }
    return raw as DraftApplicantPayload[];
}

function parseISODateOnlyToUtcStart(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!));
}

/**
 * Tạo hồ sơ PAID từ draft, gán mã VN-…, xóa draft trong cùng transaction.
 */
export async function createPaidApplicationFromDraft(
    tx: Prisma.TransactionClient,
    draft: DraftRow,
): Promise<{ applicationId: string; applicationCode: string; contactEmail: string; totalAmount: number }> {
    const applicants = parseApplicantsPayload(draft.applicantsPayload);
    const applicationCode = await generateUniqueApplicationCode(tx);

    const app = await tx.visaApplication.create({
        data: {
            userId: draft.userId,
            portId: draft.portId,
            contactEmail: draft.contactEmail,
            contactPhone: draft.contactPhone,
            visaType: draft.visaType,
            visaCategory: draft.visaCategory,
            purposeOfVisit: draft.purposeOfVisit,
            arrivalDate: draft.arrivalDate,
            processingTime: draft.processingTime,
            extraServices: draft.extraServices as Prisma.InputJsonValue,
            applicantCount: draft.applicantCount,
            totalAmount: draft.totalAmount,
            status: VisaApplicationStatus.PAID,
            applicationCode,
            applicants: {
                create: applicants.map((a) => ({
                    fullName: a.full_name,
                    gender: a.gender,
                    nationality: a.nationality,
                    dateOfBirth: parseISODateOnlyToUtcStart(a.date_of_birth),
                    passportNumber: a.passport_number,
                    passportExpiryDate: parseISODateOnlyToUtcStart(a.passport_expiry_date),
                    passportImageUrl: a.passport_image_url,
                    portraitImageUrl: a.portrait_image_url ?? null,
                    flightTicketUrl: a.flight_ticket_url ?? null,
                })),
            },
        },
        select: { id: true, applicationCode: true },
    });

    await tx.applicationDraft.delete({ where: { id: draft.id } });

    if (!app.applicationCode || !APPLICATION_CODE_REGEX.test(app.applicationCode)) {
        throw new ConflictError("errors.application_code_generation_failed");
    }

    return {
        applicationId: app.id,
        applicationCode: app.applicationCode,
        contactEmail: draft.contactEmail,
        totalAmount: Number(draft.totalAmount),
    };
}
