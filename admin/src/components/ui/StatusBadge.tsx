import { getStatusLabel, getStatusStyle } from "@/lib/status"
import { getAdminStatusLabel } from "@/lib/application-status"

interface StatusBadgeProps {
 status: string
 className?: string
 /** Hiển thị nhãn 3 trạng thái admin (gộp PAID + PROCESSING). */
 useAdminLabels?: boolean
}

export function StatusBadge({ status, className, useAdminLabels }: StatusBadgeProps) {
 const label = useAdminLabels ? getAdminStatusLabel(status) : getStatusLabel(status)
 return (
 <span
 className={`inline-flex items-center rounded-md px-2.5 py-1 font-medium ${className ?? ""}`}
 style={{ fontSize: "var(--font-size-sm)", ...getStatusStyle(status) }}
 >
 {label}
 </span>
 )
}
