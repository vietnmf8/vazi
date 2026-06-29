import type { Applicant, VisaApplication } from "@prisma/client";
import { VisaApplicationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    calculatePriceFromRules,
    type CalculatePriceResult,
} from "@/services/application-pricing.service";
import { getSignedRawDownloadUrl } from "@/services/cloudinary-result-url.service";
import { NotFoundError } from "@/utils/errors";
import type { CalculatePriceDto } from "@/validators/applications.validator";

/**
 * Chuẩn hóa email tra cứu — so khớp không phân biệt hoa thường (MySQL collation có thể khác từng môi trường).
 */
function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function formatDateOnlyUtc(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function extraServicesToPricingDto(raw: VisaApplication["extraServices"]): CalculatePriceDto["extra_services"] {
    const extra: CalculatePriceDto["extra_services"] = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        if ((raw as any).vip_fast_track === true) {
            extra.vip_fast_track = true;
        }
        if ((raw as any).basic_fast_track === true) {
            extra.basic_fast_track = true;
        }
    }
    return extra;
}

function buildPricingDtoFromApplication(row: VisaApplication): CalculatePriceDto {
    return {
        visa_type: row.visaType,
        visa_category: row.visaCategory as CalculatePriceDto["visa_category"],
        applicant_count: row.applicantCount,
        processing_time: row.processingTime as CalculatePriceDto["processing_time"],
        extra_services: extraServicesToPricingDto(row.extraServices),
    };
}

export type ApplicationStatusPublic = {
    application_code: string | null;
    status: VisaApplicationStatus;
    visa_type: string;
    visa_category: string;
    arrival_date: string;
    applicant_count: number;
    total_amount: number;
    extra_services: Record<string, unknown> | null;
    download_url: string | null;
};

export type ApplicantPublic = {
    full_name: string;
    gender: string;
    nationality: string;
    date_of_birth: string;
    passport_number: string;
    passport_expiry_date: string;
    passport_image_url: string;
    portrait_image_url: string | null;
    /** URL vé máy bay hoặc thẻ lên máy bay */
    flight_ticket_url: string | null;
};

export type ApplicationDetailPublic = {
    application_id: string;
    application_code: string | null;
    status: VisaApplicationStatus;
    contact_email: string;
    contact_phone: string;
    visa_type: string;
    visa_category: string;
    purpose_of_visit: string;
    arrival_date: string;
    port_of_entry: string | null;
    processing_time: string;
    extra_services: CalculatePriceDto["extra_services"];
    applicant_count: number;
    total_amount: number;
    applicants: ApplicantPublic[];
    price_breakdown: CalculatePriceResult;
};

function mapApplicant(a: Applicant): ApplicantPublic {
    return {
        full_name: a.fullName,
        gender: a.gender,
        nationality: a.nationality,
        date_of_birth: formatDateOnlyUtc(a.dateOfBirth),
        passport_number: a.passportNumber,
        passport_expiry_date: formatDateOnlyUtc(a.passportExpiryDate),
        passport_image_url: a.passportImageUrl,
        portrait_image_url: a.portraitImageUrl,
        flight_ticket_url: a.flightTicketUrl,
    };
}

/**
 * Tra cứu trạng thái theo mã hồ sơ + email — cả hai phải khớp, không thì 404 (anti-enumeration).
 *
 * @param bookingNumber - `applicationCode` (VN-…)
 * @param email - Email liên hệ lúc đăng ký
 */
export async function getApplicationStatusByBooking(
    bookingNumber: string,
    email: string,
): Promise<ApplicationStatusPublic> {
    const normalized = normalizeEmail(email);
    const row = await prisma.visaApplication.findFirst({
        where: {
            OR: [{ applicationCode: bookingNumber }, { id: bookingNumber }],
        },
        select: {
            contactEmail: true,
            status: true,
            visaType: true,
            visaCategory: true,
            extraServices: true,
            arrivalDate: true,
            applicantCount: true,
            totalAmount: true,
            resultDocumentPublicId: true,
            applicationCode: true,
        },
    });
    if (!row || normalizeEmail(row.contactEmail) !== normalized) {
        throw new NotFoundError("errors.application_not_found");
    }
    if (!row.applicationCode && row.status === VisaApplicationStatus.PENDING) {
        throw new NotFoundError("errors.application_not_found");
    }
    const download_url =
        row.status === VisaApplicationStatus.COMPLETED
            ? getSignedRawDownloadUrl(row.resultDocumentPublicId)
            : null;
    return {
        application_code: row.applicationCode,
        status: row.status,
        visa_type: row.visaType,
        visa_category: row.visaCategory,
        extra_services: row.extraServices as any,
        arrival_date: formatDateOnlyUtc(row.arrivalDate),
        applicant_count: row.applicantCount,
        total_amount: Number(row.totalAmount),
        download_url,
    };
}

/**
 * Chi tiết đơn cho Review & Checkout — ai biết `id` cũng xem được (spec Stage 2).
 *
 * @param applicationId - Mã đơn `VN-…`
 */
export async function getApplicationDetailById(
    applicationId: string,
): Promise<ApplicationDetailPublic> {
    const row = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
            applicants: { orderBy: { fullName: "asc" } },
            port: { select: { code: true } },
        },
    });
    if (!row) {
        throw new NotFoundError("errors.application_not_found");
    }
    const pricingDto = buildPricingDtoFromApplication(row);
    const price_breakdown = await calculatePriceFromRules(pricingDto);

    return {
        application_id: row.id,
        application_code: row.applicationCode,
        status: row.status,
        contact_email: row.contactEmail,
        contact_phone: row.contactPhone,
        visa_type: row.visaType,
        visa_category: row.visaCategory,
        purpose_of_visit: row.purposeOfVisit,
        arrival_date: formatDateOnlyUtc(row.arrivalDate),
        port_of_entry: row.port?.code ?? null,
        processing_time: row.processingTime,
        extra_services: extraServicesToPricingDto(row.extraServices),
        applicant_count: row.applicantCount,
        total_amount: Number(row.totalAmount),
        applicants: row.applicants.map(mapApplicant),
        price_breakdown,
    };
}