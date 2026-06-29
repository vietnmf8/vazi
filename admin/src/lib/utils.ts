import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanMessageText(text: string | undefined | null): string {
  if (!text) return ""
  let cleaned = text.replace(/<!--[\s\S]*?(?:-->|$)/g, "").trim()
  if (cleaned.startsWith("[NLP_CACHE]")) {
    cleaned = cleaned.replace(/^\[NLP_CACHE\]\s*/, "").trim()
  }
  return cleaned
}
