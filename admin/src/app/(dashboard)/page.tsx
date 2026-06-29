"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDashboardStats } from "@/hooks/useDashboard";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Clock, PlayCircle, MessageCircleWarning, MessageSquareText, CheckCircle } from "lucide-react";
import {
    RevenueTrendChart,
    VisaTypeDistributionChart
} from "@/components/features/overview/DashboardCharts";

function KpiCard({ label, value, type }: { label: string; value: number; type: 'pending' | 'processing' | 'tickets' | 'chats' | 'completed' }) {
    const config = {
        pending: {
            bg: "bg-amber-50 border-amber-200",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            textColor: "text-amber-800",
            icon: Clock
        },
        processing: {
            bg: "bg-blue-50 border-blue-200",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            textColor: "text-blue-800",
            icon: PlayCircle
        },
        completed: {
            bg: "bg-emerald-50 border-emerald-200",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            textColor: "text-emerald-800",
            icon: CheckCircle
        },
        tickets: {
            bg: "bg-rose-50 border-rose-200",
            iconBg: "bg-rose-100",
            iconColor: "text-rose-600",
            textColor: "text-rose-800",
            icon: MessageCircleWarning
        },
        chats: {
            bg: "bg-cyan-50 border-cyan-200",
            iconBg: "bg-cyan-100",
            iconColor: "text-cyan-600",
            textColor: "text-cyan-800",
            icon: MessageSquareText
        }
    }[type];

    const Icon = config.icon;

    return (
        <div className={`rounded-xl p-5 border ${config.bg} flex items-start justify-between gap-3 overflow-hidden`}>
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${config.textColor} opacity-80 truncate`} title={label}>
                    {label}
                </p>
                <p className={`mt-2 text-3xl font-bold ${config.textColor}`}>
                    {value}
                </p>
            </div>
            <div className={`p-3 rounded-lg ${config.iconBg}`}>
                <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
        </div>
    );
}

export default function OverviewPage() {
 const { data, isLoading, error, refetch } = useDashboardStats();

 if (error) {
 return (
 <div className="p-6">
 <PageHeader titleKey="overview.title" />
 <p style={{ color: "var(--color-error)" }}>
 {t("common.error")}
 </p>
 <Button className="mt-4" onClick={() => refetch()}>
 {t("common.retry")}
 </Button>
 </div>
 );
 }

 return (
 <div className="p-6 w-full">
 <PageHeader titleKey="overview.title" />

 <div className="flex flex-col lg:flex-row gap-6 mb-8">
     {/* Group 1: 3 Cards for Applications */}
     <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
         <KpiCard
         label={t("overview.pendingApps")}
         value={data?.applications_pending ?? 0}
         type="pending"
         />
         <KpiCard
         label={t("overview.processingApps")}
         value={data?.applications_processing ?? 0}
         type="processing"
         />
         <KpiCard
         label={t("overview.completedApps")}
         value={data?.applications_completed ?? 0}
         type="completed"
         />
     </div>

     {/* Group 2: 2 Cards for Support/Chats */}
     <div className="lg:w-[40%] grid grid-cols-1 sm:grid-cols-2 gap-4">
         <KpiCard
         label={t("overview.openTickets")}
         value={data?.support_tickets_open ?? 0}
         type="tickets"
         />
         <KpiCard
         label={t("overview.activeChats")}
         value={data?.chat_sessions_active ?? 0}
         type="chats"
         />
     </div>
 </div>

 {isLoading ? (
 <p style={{ color: "var(--color-text-muted)" }}>
 {t("common.loading")}
 </p>
 ) : (
 <>
    {/* Charts Section */}
    {data && (
        <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-medium text-lg">
                            {t("overview.recentApps")}
                        </h2>
                        <Link href="/applications">
                            <Button variant="ghost" size="sm">
                                {t("overview.viewAll")}
                            </Button>
                        </Link>
                    </div>
                    {(data?.recent_applications.length ?? 0) === 0 ? (
                        <p style={{ color: "var(--color-text-muted)" }}>
                            {t("overview.empty")}
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {data?.recent_applications.map((app, index) => (
                                <li key={app.id}>
                                    <Link
                                        href={`/applications/${app.id}`}
                                        className="flex items-center justify-between rounded-lg px-4 py-3 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-2)] dark:hover:bg-zinc-800/10 transition-colors"
                                        style={{
                                            border: "1px solid var(--color-border-default)",
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {app.application_code ?? app.id}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {app.contact_email}
                                                </p>
                                            </div>
                                            {index < 3 && (
                                                <span 
                                                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                                                    style={{ 
                                                        backgroundColor: "var(--color-primary)", 
                                                        color: "white" 
                                                    }}
                                                >
                                                    Mới
                                                </span>
                                            )}
                                        </div>
                                        <StatusBadge status={app.status} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="bg-white p-5 rounded-xl border border-gray-200">
                    <h2 className="font-medium text-lg mb-4">Cơ cấu loại Visa</h2>
                    <VisaTypeDistributionChart data={data.visa_type_distribution} />
                </section>
            </div>

            <section className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="font-medium text-lg mb-4">Doanh thu & Số lượng hồ sơ</h2>
                <RevenueTrendChart data={data.revenue_trend} />
            </section>
        </div>
    )}
 </>
 )}
 </div>
 );
}
