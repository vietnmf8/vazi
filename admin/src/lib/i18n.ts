import vi from "@/messages/vi.json"

type Messages = typeof vi

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
 const parts = path.split(".")
 let current: unknown = obj
 for (const part of parts) {
 if (current == null || typeof current !== "object") return undefined
 current = (current as Record<string, unknown>)[part]
 }
 return typeof current === "string" ? current : undefined
}

/**
 * Lấy chuỗi tiếng Việt theo key dạng dot-notation.
 */
export function t(key: string, fallback?: string): string {
 return getNested(vi as Record<string, unknown>, key) ?? fallback ?? key
}

export type { Messages }
