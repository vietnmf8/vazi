import { VisaApplicationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
    getRecentApplications,
    type AdminApplicationListItem,
} from "@/services/admin/applications.admin.service";
import {
    getRecentOpenTickets,
    type AdminSupportTicketListItem,
} from "@/services/admin/support-tickets.admin.service";

export type AdminDashboardStats = {
    applications_pending: number;
    applications_processing: number;
    applications_completed: number;
    support_tickets_open: number;
    chat_sessions_active: number;
    recent_applications: AdminApplicationListItem[];
    recent_tickets: AdminSupportTicketListItem[];
    nationality_distribution: { nationality: string; count: number }[];
    revenue_trend: { month: string; amount: number; count: number }[];
    visa_type_distribution: { type: string; count: number }[];
    extra_services_distribution: { service: string; count: number }[];
    application_funnel: { stage: string; count: number }[];
};

/**
 * KPI và danh sách việc cần làm cho trang tổng quan admin.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

    const [
        applicationsPending,
        applicationsProcessing,
        applicationsCompletedCount,
        supportTicketsOpen,
        chatSessionsActive,
        recentApplications,
        recentTickets,
        applicantGroups,
        visaAppsForTrend,
        visaTypeGroups,
        visaAppsForExtra,
        draftCount,
        pendingCount,
        processingCount,
        completedCount
    ] = await Promise.all([
        prisma.applicationDraft.count({
            where: { expiresAt: { gt: new Date() } },
        }),
        prisma.visaApplication.count({ where: { status: VisaApplicationStatus.PROCESSING } }),
        prisma.visaApplication.count({ where: { status: VisaApplicationStatus.COMPLETED } }),
        prisma.supportTicket.count({
            where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        }),
        prisma.chatSession.count({
            where: { status: { in: ["AI_HANDLING", "HUMAN_HANDLING"] } },
        }),
        getRecentApplications(5),
        getRecentOpenTickets(5),
        // 1. Nationality
        prisma.applicant.groupBy({
            by: ['nationality'],
            _count: { _all: true },
            orderBy: { _count: { nationality: 'desc' } },
            take: 15
        }),
        // 2. Revenue Trend
        prisma.visaApplication.findMany({
            where: { createdAt: { gte: currentYearStart } },
            select: { createdAt: true, totalAmount: true }
        }),
        // 3. Visa Type Distribution
        prisma.visaApplication.groupBy({
            by: ['processingTime'],
            _count: { _all: true },
        }),
        // 4. Extra Services
        prisma.visaApplication.findMany({
            select: { extraServices: true },
        }),
        // 5. Funnel
        prisma.applicationDraft.count(),
        prisma.visaApplication.count({ where: { status: VisaApplicationStatus.PENDING } }),
        prisma.visaApplication.count({ where: { status: { in: [VisaApplicationStatus.PAID, VisaApplicationStatus.PROCESSING] } } }),
        prisma.visaApplication.count({ where: { status: { in: [VisaApplicationStatus.COMPLETED, VisaApplicationStatus.REJECTED] } } })
    ]);

    // Format Revenue Trend
    const monthlyTrend: Record<string, { amount: number; count: number }> = {};
    for (let i = 0; i < 12; i++) {
        monthlyTrend[`T${i + 1}`] = { amount: 0, count: 0 };
    }
    visaAppsForTrend.forEach(app => {
        const month = app.createdAt.getMonth() + 1;
        const key = `T${month}`;
        if (monthlyTrend[key]) {
            monthlyTrend[key].amount += Number(app.totalAmount || 0);
            monthlyTrend[key].count += 1;
        }
    });
    const revenue_trend = Object.keys(monthlyTrend).map(month => ({
        month,
        amount: monthlyTrend[month].amount,
        count: monthlyTrend[month].count
    }));

    // Format Extra Services
    const extraCounts: Record<string, number> = {};
    visaAppsForExtra.forEach(app => {
        if (app.extraServices && Array.isArray(app.extraServices)) {
            app.extraServices.forEach((srv: any) => {
                if (srv.name) {
                    extraCounts[srv.name] = (extraCounts[srv.name] || 0) + 1;
                } else if (typeof srv === 'string') {
                    extraCounts[srv] = (extraCounts[srv] || 0) + 1;
                }
            });
        } else if (app.extraServices && typeof app.extraServices === 'object') {
            Object.keys(app.extraServices).forEach(k => {
                if ((app.extraServices as any)[k]) {
                    extraCounts[k] = (extraCounts[k] || 0) + 1;
                }
            });
        }
    });
    const extra_services_distribution = Object.entries(extraCounts)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        applications_pending: applicationsPending,
        applications_processing: applicationsProcessing,
        applications_completed: applicationsCompletedCount,
        support_tickets_open: supportTicketsOpen,
        chat_sessions_active: chatSessionsActive,
        recent_applications: recentApplications,
        recent_tickets: recentTickets,
        nationality_distribution: applicantGroups.map(g => ({
            nationality: g.nationality,
            count: g._count._all
        })),
        revenue_trend,
        visa_type_distribution: visaTypeGroups.map(g => {
            const type = g.processingTime;
            let friendlyName = type;
            if (type === "NORMAL") friendlyName = "Tiêu chuẩn";
            else if (type === "URGENT_4H") friendlyName = "Khẩn cấp 4H";
            else if (type === "URGENT_8H") friendlyName = "Khẩn cấp 8H";
            
            return {
                type: friendlyName,
                count: g._count._all
            };
        }),
        extra_services_distribution: extra_services_distribution.map(item => {
            let friendlyName = item.service;
            if (friendlyName === "AIRPORT_FAST_TRACK" || friendlyName === "vip_fast_track") friendlyName = "Đón khách VIP";
            else if (friendlyName === "CAR_PICKUP" || friendlyName === "car_pickup") friendlyName = "Xe đưa đón";
            else if (friendlyName === "SIM_CARD") friendlyName = "SIM Điện thoại";
            
            return {
                service: friendlyName,
                count: item.count
            };
        }),
        application_funnel: [
            { stage: "1. Khách bắt đầu điền đơn (Nháp)", count: draftCount },
            { stage: "2. Đã nộp, Chờ thanh toán", count: pendingCount },
            { stage: "3. Đã thanh toán & Đang xử lý", count: processingCount },
            { stage: "4. Hoàn tất duyệt & Cấp Visa", count: completedCount }
        ]
    };
}
