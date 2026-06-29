import type { CSSProperties } from "react"

const VISA_TYPE_STYLES: Record<string, CSSProperties> = {
 E_VISA: {
 backgroundColor: "rgba(37, 99, 235, 0.10)",
 color: "#2563eb",
 border: "1px solid rgba(37, 99, 235, 0.2)",
 },
 VOA: {
 backgroundColor: "rgba(15, 118, 110, 0.10)",
 color: "#0f766e",
 border: "1px solid rgba(15, 118, 110, 0.2)",
 },
}

const VISA_TYPE_LABELS: Record<string, string> = {
 E_VISA: "E-Visa",
 VOA: "VOA",
}

export function getVisaTypeStyle(type: string): CSSProperties {
 return VISA_TYPE_STYLES[type] ?? { color: "var(--color-text-muted)" }
}

export function getVisaTypeLabel(type: string): string {
 return VISA_TYPE_LABELS[type] ?? type
}
