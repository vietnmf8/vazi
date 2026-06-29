"use client";

import { useEffect, useRef } from "react";

interface UseProactiveChatTriggerOptions {
  /** Số giây chờ trước khi tự động mở widget (default: 30) */
  delaySeconds?: number;
  /** Cho phép trigger (ví dụ: chỉ bật trên trang apply) */
  enabled?: boolean;
  /** Hàm mở widget từ useChat */
  openWidget: () => void;
  /** Trạng thái widget — không trigger nếu đã mở */
  isOpen: boolean;
}

/**
 * Tự động mở chat widget sau X giây — proactive engagement trên trang apply/visa requirements.
 *
 * Chỉ trigger 1 lần mỗi session (lưu sessionStorage flag).
 */
export function useProactiveChatTrigger({
  delaySeconds = 30,
  enabled = true,
  openWidget,
  isOpen,
}: UseProactiveChatTriggerOptions): void {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || isOpen) return;

    // Chỉ trigger 1 lần mỗi tab session
    const flagKey = "fastvisa_proactive_triggered";
    if (sessionStorage.getItem(flagKey)) return;

    const timer = setTimeout(() => {
      if (!hasTriggeredRef.current && !isOpen) {
        hasTriggeredRef.current = true;
        sessionStorage.setItem(flagKey, "1");
        openWidget();
      }
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [enabled, isOpen, openWidget, delaySeconds]);
}
