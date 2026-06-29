import type { ApplyDraft } from "./applySchemas"
import { APPLY_DRAFT_STORAGE_KEY } from "./applySchemas"

export const APPLY_DRAFT_HEARTBEAT_KEY = "fastvisa_apply_heartbeat"

/**
 * Đọc draft từ localStorage — bọc try/catch vì Safari private mode có thể chặn storage.
 * Kiểm tra heartbeat: Nếu trang được load lại sau khi đã đóng quá 15 phút (900000ms),
 * xoá draft. Điều này giải quyết vấn đề Chrome "Continue where you left off".
 */
export function loadApplyDraft(): ApplyDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(APPLY_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as ApplyDraft
    
    // Check 24h expiration
    if (draft.updatedAt) {
      const isExpired = Date.now() - draft.updatedAt > 24 * 60 * 60 * 1000;
      if (isExpired) {
        clearApplyDraft();
        return null;
      }
    }

    // Check Heartbeat (15 minutes)
    const heartbeat = window.localStorage.getItem(APPLY_DRAFT_HEARTBEAT_KEY)
    if (heartbeat) {
      const timeSinceLastActive = Date.now() - parseInt(heartbeat, 10);
      if (timeSinceLastActive > 15 * 60 * 1000) { // 15 phút
        clearApplyDraft();
        return null;
      }
    }
    
    return draft
  } catch {
    return null
  }
}

export function pingApplyHeartbeat(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(APPLY_DRAFT_HEARTBEAT_KEY, Date.now().toString())
  } catch {
    // noop
  }
}

export function saveApplyDraft(draft: ApplyDraft): void {
  if (typeof window === "undefined") return
  try {
    const draftWithTime = { ...draft, updatedAt: Date.now() }
    window.localStorage.setItem(APPLY_DRAFT_STORAGE_KEY, JSON.stringify(draftWithTime))
  } catch {
    // Không chặn luồng form nếu storage đầy hoặc bị chặn
  }
}

export function clearApplyDraft(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(APPLY_DRAFT_STORAGE_KEY)
  } catch {
    // noop
  }
}

/** Lưu draft_id trước redirect PayPal — success page đọc lại sau capture */
export const PENDING_DRAFT_STORAGE_KEY = "fastvisa_pending_draft_id"

/** @deprecated Dùng PENDING_DRAFT_STORAGE_KEY */
export const PENDING_APPLICATION_STORAGE_KEY = PENDING_DRAFT_STORAGE_KEY

export function savePendingDraftId(draftId: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(PENDING_DRAFT_STORAGE_KEY, draftId)
  } catch {
    // noop
  }
}

export function loadPendingDraftId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(PENDING_DRAFT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearPendingDraftId(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(PENDING_DRAFT_STORAGE_KEY)
  } catch {
    // noop
  }
}

/** @deprecated Dùng savePendingDraftId */
export const savePendingApplicationId = savePendingDraftId

/** @deprecated Dùng loadPendingDraftId */
export const loadPendingApplicationId = loadPendingDraftId

/** @deprecated Dùng clearPendingDraftId */
export const clearPendingApplicationId = clearPendingDraftId
