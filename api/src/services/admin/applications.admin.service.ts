import {
    VisaType,
    PurposeOfVisit,
    Prisma,
    VisaApplicationStatus,
} from "@prisma/client";
import { getPusher } from "@/lib/pusher-client";

import { paginateDeferredJoin } from "@/services/shared/pagination.service";
import * as Sentry from "@sentry/node";
import prisma from "@/lib/prisma";
import { ForbiddenError, NotFoundError, AppError } from "@/utils/errors";
import { calculatePriceFromRules } from "@/services/application-pricing.service";
import {
    ADMIN_VISIBLE_STATUSES,
    assertValidApplicationStatusTransition,
} from "@/services/admin/application-status-transitions";
import { getSignedRawDownloadUrl, getSignedImageDownloadUrl } from "@/services/cloudinary-result-url.service";
import {
    sendApplicationCompletedEmail,
    sendApplicationRejectedEmail,
    sendApplicationProcessingEmail,
} from "@/services/mail.service";
import type {
    AdminApplicationsQueryDto,
    AdminUpdateApplicationDto,
} from "@/validators/admin/applications.validator";
import {
    parseISODateOnlyToUtcStart,
} from "@/validators/applications.validator";

function formatDateOnlyUtc(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function buildApplicationsWhere(
    query: AdminApplicationsQueryDto,
): Prisma.VisaApplicationWhereInput {
    const where: Prisma.VisaApplicationWhereInput = {};
    if (query.status) {
        // Mỗi trạng thái được filter độc lập — PAID và PROCESSING không còn gộp nhóm
        where.status = query.status as VisaApplicationStatus;
    } else {
        where.status = { in: ADMIN_VISIBLE_STATUSES };
    }
    if (query.visa_type) {
        where.visaType = query.visa_type as VisaType;
    }
    if (query.date) {
        const parts = query.date.split(",");
        const startDate = new Date(parts[0]);
        startDate.setUTCHours(0, 0, 0, 0);

        let endDate: Date;
        if (parts.length > 1 && parts[1]) {
            endDate = new Date(parts[1]);
        } else {
            endDate = new Date(startDate);
        }
        endDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCDate(endDate.getUTCDate() + 1);

        where.createdAt = { gte: startDate, lt: endDate };
    }
    if (query.search) {
        const term = query.search;
        where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            {
                OR: [
                    { applicationCode: { contains: term } },
                    { contactEmail: { contains: term } },
                    { contactPhone: { contains: term } },
                    { id: { contains: term } },
                    { applicants: { some: { passportNumber: { contains: term } } } },
                ],
            },
        ];
    }
    return where;
}

export type AdminApplicationListItem = {
    id: string;
    sequence_no: number;
    application_code: string | null;
    contact_email: string;
    contact_phone: string;
    visa_type: string;
    applicant_count: number;
    total_amount: number;
    status: VisaApplicationStatus;
    created_at: string;
    passports: string;
};

export type AdminApplicationDetail = AdminApplicationListItem & {
    visa_category: string;
    purpose_of_visit: string;
    arrival_date: string;
    processing_time: string;
    port_of_entry: string | null;
    extra_services: Record<string, unknown> | null;
    resultDocumentPublicId: string | null;
    result_document_download_url: string | null;
    pickupPointImagePublicId: string | null;
    pickup_point_image_download_url: string | null;
    applicants: Array<{
        id: string;
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
    }>;
    payments: Array<{
        id: string;
        transaction_id: string;
        amount: number;
        status: string;
        payment_method: string;
        created_at: string;
    }>;
};

export type AdminApplicationAuditLogItem = {
    id: string;
    action: string;
    changed_fields: Record<string, { old: unknown; new: unknown }>;
    admin_user_id: string;
    admin_email: string | null;
    created_at: string;
};

function mapListRow(r: {
    id: string;
    sequenceNo: number;
    applicationCode: string | null;
    contactEmail: string;
    contactPhone: string;
    visaType: string;
    applicantCount: number;
    totalAmount: Prisma.Decimal;
    status: VisaApplicationStatus;
    createdAt: Date;
    applicants?: { passportNumber: string }[];
}): AdminApplicationListItem {
    return {
        id: r.id,
        sequence_no: r.sequenceNo,
        application_code: r.applicationCode,
        contact_email: r.contactEmail,
        contact_phone: r.contactPhone,
        visa_type: r.visaType,
        applicant_count: r.applicantCount,
        total_amount: Number(r.totalAmount),
        status: r.status,
        created_at: r.createdAt.toISOString(),
        passports: r.applicants ? r.applicants.map((a) => a.passportNumber).join(", ") : "",
    };
}

/**
 * Danh sách đơn visa cho admin — mặc định loại PENDING, chỉ PAID+.
 */
export async function listAdminApplications(
    query: AdminApplicationsQueryDto,
): Promise<{ rows: AdminApplicationListItem[]; total: number }> {
    const where = buildApplicationsWhere(query);
    const page = query.page;
    const limit = query.limit;

    const orderBy: Prisma.VisaApplicationOrderByWithRelationInput[] =
        query.sort_by && query.sort_dir
            ? [
                  ...(query.sort_by === "applicant_count"
                      ? [{ applicantCount: query.sort_dir }, { createdAt: "desc" as const }]
                      : []),
                  ...(query.sort_by === "sequence_no"
                      ? [{ sequenceNo: query.sort_dir }]
                      : []),
                  ...(query.sort_by === "application_code"
                      ? [{ applicationCode: query.sort_dir }]
                      : []),
                  ...(query.sort_by === "contact_email"
                      ? [{ contactEmail: query.sort_dir }, { createdAt: "desc" as const }]
                      : []),
                  ...(query.sort_by === "visa_type"
                      ? [{ visaType: query.sort_dir }, { createdAt: "desc" as const }]
                      : []),
                  ...(query.sort_by === "total_amount"
                      ? [{ totalAmount: query.sort_dir }, { createdAt: "desc" as const }]
                      : []),
                  ...(query.sort_by === "status"
                      ? [
                            {
                                // Enum alphabet asc: COMPLETED → PAID → PROCESSING → REJECTED (đúng thứ tự nghiệp vụ desc)
                                status: query.sort_dir === "desc" ? ("asc" as const) : ("desc" as const),
                            },
                            { createdAt: "desc" as const },
                        ]
                      : []),
                  ...(query.sort_by === "created_at" ? [{ createdAt: query.sort_dir }] : []),
              ]
            : [{ createdAt: "desc" }];

    const { total, rows } = await paginateDeferredJoin(prisma.visaApplication, {
        where,
        orderBy,
        page,
        limit,
        select: {
            id: true,
            sequenceNo: true,
            applicationCode: true,
            contactEmail: true,
            contactPhone: true,
            visaType: true,
            applicantCount: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            applicants: { select: { passportNumber: true } },
        },
    });

    return {
        total,
        rows: rows.map((r: any) => mapListRow(r)),
    };
}

/**
 * Chi tiết đơn visa kèm applicants và payments — chỉ đơn PAID+ (hoặc legacy paid).
 */
export async function getAdminApplicationById(
    applicationId: string,
): Promise<AdminApplicationDetail> {
    const row = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
            applicants: {
                orderBy: { fullName: "asc" },
            },
            payments: {
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    transactionId: true,
                    amount: true,
                    status: true,
                    paymentMethod: true,
                    createdAt: true,
                },
            },
            port: { select: { code: true } },
        },
    });

    if (!row) {
        throw new NotFoundError("errors.application_not_found");
    }
    if (row.status === VisaApplicationStatus.PENDING) {
        throw new NotFoundError("errors.application_not_found");
    }

    const extraServices =
        row.extraServices && typeof row.extraServices === "object" && !Array.isArray(row.extraServices)
            ? (row.extraServices as Record<string, unknown>)
            : null;

    return {
        ...mapListRow(row),
        visa_category: row.visaCategory,
        purpose_of_visit: row.purposeOfVisit,
        arrival_date: formatDateOnlyUtc(row.arrivalDate),
        processing_time: row.processingTime,
        port_of_entry: row.port?.code ?? null,
        extra_services: extraServices,
        resultDocumentPublicId: row.resultDocumentPublicId,
        // TẠI SAO: File E-Visa PDF tải lên Cloudinary là tài nguyên dạng 'raw'. Truy cập bằng đường dẫn
        // tĩnh '/image/upload/' không những bị Cloudinary chặn lỗi 404 mà còn thiếu phần mở rộng '.pdf'.
        // Chuyển sang sử dụng getSignedRawDownloadUrl giúp tự động sinh signed URL dạng '/raw/upload/',
        // đảm bảo định dạng file chính xác và bảo mật thông tin cá nhân của khách hàng.
        result_document_download_url: row.resultDocumentPublicId 
            ? getSignedRawDownloadUrl(row.resultDocumentPublicId)
            : null,
        pickupPointImagePublicId: row.pickupPointImagePublicId,
        pickup_point_image_download_url: row.pickupPointImagePublicId
            ? getSignedImageDownloadUrl(row.pickupPointImagePublicId)
            : null,
        applicants: row.applicants.map((a) => ({
            id: a.id,
            full_name: a.fullName,
            gender: a.gender,
            nationality: a.nationality,
            date_of_birth: formatDateOnlyUtc(a.dateOfBirth),
            passport_number: a.passportNumber,
            passport_expiry_date: formatDateOnlyUtc(a.passportExpiryDate),
            passport_image_url: a.passportImageUrl,
            portrait_image_url: a.portraitImageUrl,
            flight_ticket_url: a.flightTicketUrl,
        })),
        payments: row.payments.map((p) => ({
            id: p.id,
            transaction_id: p.transactionId,
            amount: Number(p.amount),
            status: p.status,
            payment_method: p.paymentMethod,
            created_at: p.createdAt.toISOString(),
        })),
    };
}

async function writeAuditLog(
    tx: Prisma.TransactionClient,
    opts: {
        applicationId: string;
        adminUserId: string;
        action: string;
        changedFields: Record<string, { old: unknown; new: unknown }>;
    },
): Promise<void> {
    if (Object.keys(opts.changedFields).length === 0) {
        return;
    }
    await tx.visaApplicationAuditLog.create({
        data: {
            applicationId: opts.applicationId,
            adminUserId: opts.adminUserId,
            action: opts.action,
            changedFields: opts.changedFields as Prisma.InputJsonValue,
        },
    });
}

/**
 * Cập nhật trạng thái đơn visa với state machine + audit log.
 */
export async function updateAdminApplicationStatus(
    applicationId: string,
    status: VisaApplicationStatus,
    adminUserId: string,
    templateName?: string,
): Promise<{ id: string; status: VisaApplicationStatus }> {
    const existing = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        select: {
            id: true,
            status: true,
            contactEmail: true,
            applicationCode: true,
            resultDocumentPublicId: true,
            pickupPointImagePublicId: true,
            applicants: { select: { fullName: true }, take: 1 },
        },
    });
    if (!existing) {
        throw new NotFoundError("errors.application_not_found");
    }
    if (existing.status === VisaApplicationStatus.PENDING) {
        throw new NotFoundError("errors.application_not_found");
    }

    if (status === VisaApplicationStatus.COMPLETED && !existing.resultDocumentPublicId) {
        throw new AppError("applications.pdf_required_for_completion", 400);
    }

    assertValidApplicationStatusTransition(existing.status, status);

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.visaApplication.update({
            where: { id: applicationId },
            data: { status },
            select: { id: true, status: true },
        });
        await writeAuditLog(tx, {
            applicationId,
            adminUserId,
            action: "STATUS_CHANGE",
            changedFields: {
                status: { old: existing.status, new: status },
            },
        });
        return result;
    });

    const code = existing.applicationCode ?? applicationId;
    // Chỉ gửi mail user khi admin xác nhận Lưu và chuyển sang COMPLETED (hoặc REJECTED)
    if (status === VisaApplicationStatus.COMPLETED && existing.status !== VisaApplicationStatus.COMPLETED) {
        const applicantName = existing.applicants?.[0]?.fullName || undefined;
        const downloadUrl = getSignedRawDownloadUrl(existing.resultDocumentPublicId, applicantName);
        const pickupImageUrl = existing.pickupPointImagePublicId ? getSignedImageDownloadUrl(existing.pickupPointImagePublicId) : null;
        void sendApplicationCompletedEmail({
            to: existing.contactEmail,
            applicationCode: code,
            downloadUrl,
            applicantName,
            templateName,
            pickupImageUrl,
        }).catch((err) => {
            Sentry.captureException(err, {
                tags: { service: "mail", action: "application_completed" },
                extra: { applicationId },
            });
        });
    } else if (status === VisaApplicationStatus.REJECTED && existing.status !== VisaApplicationStatus.REJECTED) {
        void sendApplicationRejectedEmail({
            to: existing.contactEmail,
            applicationCode: code,
        }).catch((err) => {
            Sentry.captureException(err, {
                tags: { service: "mail", action: "application_rejected" },
                extra: { applicationId },
            });
        });
    } else if (status === VisaApplicationStatus.PROCESSING && existing.status !== VisaApplicationStatus.PROCESSING) {
        void sendApplicationProcessingEmail({
            to: existing.contactEmail,
            applicationCode: code,
        }).catch((err) => {
            Sentry.captureException(err, {
                tags: { service: "mail", action: "application_processing" },
                extra: { applicationId },
            });
        });
    }

    getPusher()?.trigger("admin-notifications", "applications_updated", { timestamp: Date.now() }).catch(() => {});

    return { id: updated.id, status: updated.status };
}

/**
 * Cập nhật file đính kèm kết quả E-Visa (PDF)
 */
export async function updateAdminResultDocument(
    applicationId: string,
    publicId: string | null,
    adminUserId: string,
): Promise<{ id: string; resultDocumentPublicId: string | null }> {
    const existing = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, resultDocumentPublicId: true },
    });
    if (!existing) {
        throw new NotFoundError("errors.application_not_found");
    }

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.visaApplication.update({
            where: { id: applicationId },
            data: { resultDocumentPublicId: publicId },
            select: { id: true, resultDocumentPublicId: true },
        });
        await writeAuditLog(tx, {
            applicationId,
            adminUserId,
            action: "RESULT_DOCUMENT_UPDATE",
            changedFields: {
                resultDocumentPublicId: { old: existing.resultDocumentPublicId, new: publicId },
            },
        });
        return result;
    });

    getPusher()?.trigger("admin-notifications", "applications_updated", { timestamp: Date.now() }).catch(() => {});

    return updated;
}

/**
 * Cập nhật ảnh chụp điểm đón
 */
export async function updateAdminPickupImage(
    applicationId: string,
    publicId: string | null,
    adminUserId: string,
): Promise<{ id: string; pickupPointImagePublicId: string | null }> {
    const existing = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, pickupPointImagePublicId: true },
    });
    if (!existing) {
        throw new NotFoundError("errors.application_not_found");
    }

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.visaApplication.update({
            where: { id: applicationId },
            data: { pickupPointImagePublicId: publicId },
            select: { id: true, pickupPointImagePublicId: true },
        });
        await writeAuditLog(tx, {
            applicationId,
            adminUserId,
            action: "PICKUP_IMAGE_UPDATE",
            changedFields: {
                pickupPointImagePublicId: { old: existing.pickupPointImagePublicId, new: publicId },
            },
        });
        return result;
    });

    getPusher()?.trigger("admin-notifications", "applications_updated", { timestamp: Date.now() }).catch(() => {});

    return updated;
}

/**
 * Admin full update đơn đã thanh toán — tự tính lại giá + audit log.
 */
export async function updateAdminApplication(
    applicationId: string,
    dto: AdminUpdateApplicationDto,
    adminUserId: string,
): Promise<AdminApplicationDetail> {
    const existing = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: { applicants: true, port: { select: { code: true } } },
    });
    if (!existing) {
        throw new NotFoundError("errors.application_not_found");
    }
    if (existing.status === VisaApplicationStatus.PENDING) {
        throw new NotFoundError("errors.application_not_found");
    }

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
                throw new Error(`Applicant ${code}: Invalid nationality.`);
            }
        }
    }

    const pricing = await calculatePriceFromRules({
        visa_type: dto.visa_type,
        visa_category: dto.visa_category,
        applicant_count: dto.applicant_count,
        processing_time: dto.processing_time,
        extra_services: dto.extra_services,
    });

    const changedFields: Record<string, { old: unknown; new: unknown }> = {};
    const track = (field: string, oldVal: unknown, newVal: unknown) => {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changedFields[field] = { old: oldVal, new: newVal };
        }
    };

    track("contact_email", existing.contactEmail, dto.contact_email);
    track("contact_phone", existing.contactPhone, dto.contact_phone);
    track("visa_type", existing.visaType, dto.visa_type);
    track("visa_category", existing.visaCategory, dto.visa_category);
    track("purpose_of_visit", existing.purposeOfVisit, dto.purpose_of_visit);
    track("arrival_date", formatDateOnlyUtc(existing.arrivalDate), dto.arrival_date);
    track("processing_time", existing.processingTime, dto.processing_time);
    track("port_of_entry", existing.port?.code ?? null, portCode);
    track("applicant_count", existing.applicantCount, dto.applicant_count);
    track("total_amount", Number(existing.totalAmount), pricing.grand_total);
    track("extra_services", existing.extraServices, dto.extra_services);
    track("applicants", existing.applicants.length, dto.applicants.length);

    await prisma.$transaction(async (tx) => {
        await tx.applicant.deleteMany({ where: { applicationId } });
        await tx.visaApplication.update({
            where: { id: applicationId },
            data: {
                portId: port.id,
                contactEmail: dto.contact_email,
                contactPhone: dto.contact_phone,
                visaType: dto.visa_type as VisaType,
                visaCategory: dto.visa_category,
                purposeOfVisit: dto.purpose_of_visit as PurposeOfVisit,
                arrivalDate: parseISODateOnlyToUtcStart(dto.arrival_date),
                processingTime: dto.processing_time,
                extraServices: dto.extra_services as Prisma.InputJsonValue,
                applicantCount: dto.applicant_count,
                totalAmount: new Prisma.Decimal(pricing.grand_total.toFixed(2)),
                applicants: {
                    create: dto.applicants.map((a) => ({
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
        });
        await writeAuditLog(tx, {
            applicationId,
            adminUserId,
            action: "UPDATE",
            changedFields,
        });
    });

    getPusher()?.trigger("admin-notifications", "applications_updated", { timestamp: Date.now() }).catch(() => {});

    return getAdminApplicationById(applicationId);
}

/**
 * Lịch sử audit log của đơn visa.
 */
export async function listAdminApplicationAuditLogs(
    applicationId: string,
): Promise<AdminApplicationAuditLogItem[]> {
    const app = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, status: true },
    });
    if (!app || app.status === VisaApplicationStatus.PENDING) {
        throw new NotFoundError("errors.application_not_found");
    }

    const rows = await prisma.visaApplicationAuditLog.findMany({
        where: { applicationId },
        orderBy: { createdAt: "desc" },
        include: {
            adminUser: { select: { email: true } },
        },
    });

    return rows.map((r) => ({
        id: r.id,
        action: r.action,
        changed_fields: r.changedFields as Record<string, { old: unknown; new: unknown }>,
        admin_user_id: r.adminUserId,
        admin_email: r.adminUser.email,
        created_at: r.createdAt.toISOString(),
    }));
}

/**
 * Lấy N đơn mới nhất cho dashboard — chỉ PAID+.
 */
export async function getRecentApplications(limit: number): Promise<AdminApplicationListItem[]> {
    const rows = await prisma.visaApplication.findMany({
        where: { status: { in: ADMIN_VISIBLE_STATUSES } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            sequenceNo: true,
            applicationCode: true,
            contactEmail: true,
            contactPhone: true,
            visaType: true,
            applicantCount: true,
            totalAmount: true,
            status: true,
            createdAt: true,
        },
    });
    return rows.map(mapListRow);
}
