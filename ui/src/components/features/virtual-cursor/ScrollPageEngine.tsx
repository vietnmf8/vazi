"use client";

import { useEffect, useRef } from "react";
import { useAgentStore } from "@/stores/agentStore";

// Số lần thử lại tìm section và khoảng cách giữa các lần — cần cho combo NAVIGATE_AND_SCROLL,
// vì sau router.push() trang mới có thể chưa mount xong khi scrollCommand được trigger.
// Mirror đúng cấu hình của VirtualMouseEngine.
const FIND_ELEMENT_MAX_RETRIES = 10;
const FIND_ELEMENT_RETRY_DELAY_MS = 150; // tổng tối đa ~1.5s

/**
 * ScrollPageEngine
 *
 * Lắng nghe sự kiện `scrollCommand` từ agentStore — lệnh cuộn trang THUẦN
 * (không click), độc lập với VirtualMouseEngine.
 *
 * Hỗ trợ 3 mode:
 *   - "top"     : cuộn lên đầu trang, áp dụng MỌI route trên site.
 *   - "bottom"  : cuộn xuống cuối trang, áp dụng MỌI route trên site.
 *   - "element" : cuộn đến 1 SECTION [data-ai-target] — KHÁC với [data-ai-element] mà
 *                 VirtualMouseEngine dùng cho phần tử click được. Có retry-poll ~1.5s vì
 *                 combo NAVIGATE_AND_SCROLL có thể trigger ngay sau router.push() trước khi
 *                 trang mới mount xong section.
 */
export function ScrollPageEngine() {
  const scrollCommand = useAgentStore((s) => s.scrollCommand);
  const activeIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scrollCommand) return;
    activeIdRef.current = scrollCommand.id;
    const currentId = scrollCommand.id;
    const { mode, target } = scrollCommand;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const scrollYBefore = window.scrollY;

    function logDone() {
      timers.push(setTimeout(() => {
        if (activeIdRef.current !== currentId) return;
        const scrollYAfter = window.scrollY;
      }, 700));
    }

    if (mode === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      logDone();
    } else if (mode === "bottom") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      logDone();
    } else if (mode === "element" && target) {
      function findSectionWithRetry(attempt: number) {
        if (activeIdRef.current !== currentId) return;
        const el = document.querySelector<HTMLElement>(`[data-ai-target="${target}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          logDone();
          return;
        }
        if (attempt >= FIND_ELEMENT_MAX_RETRIES) {
          console.warn(`[ScrollPage] ⚠ Không tìm thấy section sau ${FIND_ELEMENT_MAX_RETRIES} lần thử: ${target}`);
          return;
        }
        timers.push(setTimeout(() => findSectionWithRetry(attempt + 1), FIND_ELEMENT_RETRY_DELAY_MS));
      }
      findSectionWithRetry(0);
    }

    return () => timers.forEach(clearTimeout);
  }, [scrollCommand]);

  return null;
}
