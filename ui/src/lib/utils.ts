import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility gộp class Tailwind, xử lý conflict và loại bỏ duplicate.
 * Dùng clsx để merge conditional classes, twMerge để resolve Tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
