import type { FieldErrors, FieldValues } from "react-hook-form"

/**
 * Cuộn tới field lỗi đầu tiên — hỗ trợ nested path (applicants.0.full_name).
 * Dùng attribute [data-field] do RHF name có thể không map 1-1 với id.
 */
export function scrollToFirstError<T extends FieldValues>(errors: FieldErrors<T>, delayMs = 300) {
  const path = findFirstErrorPath(errors)
  if (!path) return

  const selector = [
    `[data-field="${path}"]`,
    `[name="${path}"]`,
    `#${path.replace(/\./g, "-")}`,
  ].join(", ")

  setTimeout(() => {
    const el = document.querySelector(selector)
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    if (el instanceof HTMLElement) {
      el.focus({ preventScroll: true })
    }
  }, delayMs)
}

function findFirstErrorPath(errors: FieldErrors<FieldValues>, prefix = ""): string | null {
  for (const key of Object.keys(errors)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = errors[key as keyof typeof errors]

    if (!value) continue
    if (typeof value === "object" && "message" in value && value.message) {
      return fullKey
    }
    if (typeof value === "object") {
      const nested = findFirstErrorPath(value as FieldErrors<FieldValues>, fullKey)
      if (nested) return nested
    }
  }
  return null
}
