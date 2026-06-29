import { t } from "@/lib/i18n"

interface PageHeaderProps {
 titleKey: string
 description?: string
 children?: React.ReactNode
}

export function PageHeader({ titleKey, description, children }: PageHeaderProps) {
 return (
 <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
 <div>
 <h1
 className="font-semibold"
 style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-text-primary)" }}
 >
 {t(titleKey)}
 </h1>
 {description && (
 <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-muted)" }}>
 {description}
 </p>
 )}
 </div>
 {children}
 </div>
 )
}
