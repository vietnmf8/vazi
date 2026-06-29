"use client"

import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { fetchApplicationAuditLogs } from "@/lib/api/applications.api"
import { t } from "@/lib/i18n"

import { getAdminStatusLabel } from "@/lib/application-status"
import type { VisaApplicationStatus } from "@/types/api"

type ApplicationAuditTimelineProps = {
  applicationId: string
}

function getStatusColor(status: string | null) {
  switch (status) {
    case "PAID":
      return "text-blue-600 dark:text-blue-400"
    case "PROCESSING":
      return "text-orange-600 dark:text-orange-400"
    case "COMPLETED":
      return "text-green-600 dark:text-green-400"
    case "REJECTED":
      return "text-red-600 dark:text-red-400"
    default:
      return "text-gray-600 dark:text-gray-400"
  }
}

function formatAuditField(field: string, diff: { old: any; new: any }) {
  if (field === "status") {
    const oldStatus = diff.old ? getAdminStatusLabel(diff.old as VisaApplicationStatus) : "—"
    const newStatus = diff.new ? getAdminStatusLabel(diff.new as VisaApplicationStatus) : "—"
    return (
      <>
        <strong>Trạng thái:</strong>{" "}
        <span className={`font-medium ${getStatusColor(diff.old)}`}>{oldStatus}</span>
        {" → "}
        <span className={`font-medium ${getStatusColor(diff.new)}`}>{newStatus}</span>
      </>
    )
  }
  
  if (field === "resultDocumentPublicId") {
    if (!diff.old && diff.new) {
      return (
        <>
          <strong>Kết quả:</strong> Đã tải lên tệp đính kèm
        </>
      )
    }
    if (diff.old && !diff.new) {
      return (
        <>
          <strong>Kết quả:</strong> Đã xóa tệp đính kèm
        </>
      )
    }
    return (
      <>
        <strong>Kết quả:</strong> Đã cập nhật tệp đính kèm
      </>
    )
  }
  
  return (
    <>
      <strong>{field}:</strong> {JSON.stringify(diff.old)} → {JSON.stringify(diff.new)}
    </>
  )
}

/**
 * Timeline lịch sử chỉnh sửa đơn visa bởi admin.
 */
export function ApplicationAuditTimeline({ applicationId }: ApplicationAuditTimelineProps) {
 const { data, isLoading, error } = useQuery({
 queryKey: ["applications", applicationId, "audit-logs"],
 queryFn: () => fetchApplicationAuditLogs(applicationId),
 })

 if (isLoading) {
 return <p style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</p>
 }

 if (error) {
 return <p style={{ color: "var(--color-error)" }}>{t("common.error")}</p>
 }

 if (!data?.length) {
 return (
 <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
 {t("applications.auditEmpty")}
 </p>
 )
 }

 return (
 <ul className="space-y-3" aria-label={t("applications.auditTitle")}>
 {data.map((log) => (
 <li
 key={log.id}
 className="rounded-lg px-4 py-3"
 style={{
 backgroundColor: "var(--color-surface-base)",
 border: "1px solid var(--color-border-default)",
 }}
 >
 <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
 <span className="font-medium text-sm">
 {log.action === "STATUS_CHANGE"
 ? t("applications.auditStatusChange")
 : t("applications.auditUpdate")}
 </span>
 <time
 dateTime={log.created_at}
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
 </time>
 </div>
 <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
 {log.admin_email ?? log.admin_user_id}
 </p>
 <ul className="mt-2 space-y-1 text-sm">
        {Object.entries(log.changed_fields).map(([field, diff]) => (
          <li key={field}>
            {formatAuditField(field, diff)}
          </li>
        ))}
 </ul>
 </li>
 ))}
 </ul>
 )
}
