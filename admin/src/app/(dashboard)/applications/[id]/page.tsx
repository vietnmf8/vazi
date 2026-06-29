"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { PageHeader } from "@/components/layout/PageHeader"
import { ArrowLeft } from "lucide-react"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { StatusDropdown } from "@/components/ui/StatusDropdown"
import { Button } from "@/components/ui/Button"
import { useApplication } from "@/hooks/useApplications"
import { t } from "@/lib/i18n"
import { ApplicationAuditTimeline } from "./ApplicationAuditTimeline"
import { ApplicationEditForm } from "./ApplicationEditForm"
import { PassportImage } from "./PassportImage"
import { ResultDocumentUpload } from "./ResultDocumentUpload"
import { PickupImageUpload } from "./PickupImageUpload"

export default function ApplicationDetailPage() {
 const params = useParams()
 const id = params.id as string
 const { data, isLoading, error } = useApplication(id)

 if (isLoading) {
 return (
 <div className="p-6">
 <p>{t("common.loading")}</p>
 </div>
 )
 }

 if (error || !data) {
 return (
 <div className="p-6">
 <p style={{ color: "var(--color-error)" }}>{t("common.error")}</p>
 <Link href="/applications">
 <Button className="mt-4">{t("applications.back")}</Button>
 </Link>
 </div>
 )
 }

 const displayCode = data.application_code ?? "—"
 const formatVisaType = (str: string) => str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

 return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/applications"
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("applications.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("applications.detailTitle")}
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="xl:col-span-2 space-y-6">
          <div
            className="rounded-xl p-5 space-y-3"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--color-text-muted)" }}>{t("applications.colId")}:</span>
              <strong>{displayCode}</strong>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--color-text-muted)" }}>{t("applications.colStatus")}:</span>
              <StatusDropdown applicationId={id} currentStatus={data.status} application={data} />
            </div>
            <p>
              <strong>{t("applications.contact")}:</strong> {data.contact_email} · {data.contact_phone}
            </p>
            <p>
              {formatVisaType(data.visa_type)}{data.extra_services?.vip_fast_track ? " (+ VIP Fast Track)" : data.extra_services?.basic_fast_track ? " (+ Basic Fast Track)" : ""} · {data.applicant_count} người · ${data.total_amount.toFixed(2)}
            </p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              {format(new Date(data.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>

          <section
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <h2 className="font-medium mb-3" style={{ fontSize: "var(--font-size-lg)" }}>
              {t("applications.editTitle")}
            </h2>
            <ApplicationEditForm application={data} />
          </section>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">

          <ResultDocumentUpload application={data} />
          <PickupImageUpload application={data} />

          <section
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <h2 className="font-medium mb-3" style={{ fontSize: "var(--font-size-lg)" }}>
              {t("applications.auditTitle")}
            </h2>
            <ApplicationAuditTimeline applicationId={id} />
          </section>

          <section>
            <h2 className="font-medium mb-3" style={{ fontSize: "var(--font-size-lg)" }}>
              {t("applications.applicants")}
            </h2>
            <div className="space-y-4">
              {data.applicants.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg overflow-hidden flex flex-col"
                  style={{
                    backgroundColor: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border-default)",
                  }}
                >
                  {/* Lưới ảnh: Ảnh chân dung (nếu có) | Passport | Vé máy bay (nếu có) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-[var(--color-border-default)]">
                    {/* Ảnh chân dung — chỉ hiện khi có (E-Visa) */}
                    {a.portrait_image_url && (
                      <div className="w-full aspect-[4/3] bg-gray-100 relative">
                        <PassportImage
                          src={a.portrait_image_url}
                          alt={`Portrait ${a.full_name}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black/50 py-0.5">
                          Ảnh chân dung
                        </span>
                      </div>
                    )}
                    {/* Ảnh Passport — luôn hiển thị */}
                    <div className="w-full aspect-[4/3] bg-gray-100 relative">
                      <PassportImage
                        src={a.passport_image_url}
                        alt={`Passport ${a.full_name}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black/50 py-0.5">
                        Hộ chiếu
                      </span>
                    </div>
                    {/* Vé máy bay — chỉ hiện khi có */}
                    {a.flight_ticket_url && (
                      <div className="w-full aspect-[4/3] bg-gray-100 relative">
                        <PassportImage
                          src={a.flight_ticket_url}
                          alt={`Flight ticket ${a.full_name}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black/50 py-0.5">
                          Vé máy bay
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-lg">{a.full_name}</p>
                    <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                      {a.nationality} · {a.passport_number}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
 )
}
