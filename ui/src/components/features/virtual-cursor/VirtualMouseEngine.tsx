"use client";

import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { MousePointer } from "lucide-react";
import { useAgentStore } from "@/stores/agentStore";
import { reportActionSuccess } from "@/lib/api/chat.api";
import { getCountryNameByCode } from "@/lib/flagcdn";

// Số lần thử lại tìm phần tử và khoảng cách giữa các lần — cần cho combo NAVIGATE_AND_CLICK,
// vì sau router.push() trang mới có thể chưa mount xong khi virtualClick được trigger.
const FIND_ELEMENT_MAX_RETRIES = 10;
const FIND_ELEMENT_RETRY_DELAY_MS = 150; // tổng tối đa ~1.5s

// Số lần thử lại tìm OPTION trong dropdown đã mở (Phase 2 — chọn quốc gia) — đợi Radix Popover
// portal render xong, thường <100ms nhưng để dư budget cho máy chậm/headless.
const FIND_OPTION_MAX_RETRIES = 10;
const FIND_OPTION_RETRY_DELAY_MS = 150; // tổng tối đa ~1.5s

/**
 * VirtualMouseEngine
 *
 * Lắng nghe sự kiện `virtualClick` từ agentStore.
 * Khi được kích hoạt:
 *   0. Nếu chưa tìm thấy phần tử (vd. trang vừa điều hướng chưa mount xong) → retry-poll tối đa ~1.5s
 *      trước khi báo thất bại qua [SYSTEM_HIDDEN] để AI biết và phản hồi đúng với người dùng.
 *   1. Nếu phần tử đích bị ẩn hoặc ngoài viewport → scroll đến phần tử trước
 *   2. Xuất hiện ở giữa màn hình, di chuyển đến phần tử đích
 *   3. Giả lập nhấn chuột (press animation + element.click())
 *   4. Ẩn dần sau ~1350ms
 */
export function VirtualMouseEngine() {
  const virtualClick = useAgentStore((s) => s.virtualClick);
  const [visible, setVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const activeIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!virtualClick) return;

    const vc = virtualClick;
    activeIdRef.current = vc.id;
    const currentId = vc.id;
    const target = vc.target;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const anims: { stop: () => void }[] = [];
    let activeEl: HTMLElement | null = null;

    function findElementWithRetry(attempt: number) {
      if (activeIdRef.current !== currentId) return;
      const el = document.querySelector<HTMLElement>(`[data-ai-element="${target}"]`);
      if (el) {
        activeEl = el;
        runClickSequence(el);
        return;
      }
      if (attempt >= FIND_ELEMENT_MAX_RETRIES) {
        console.warn(`[VirtualMouse] ⚠ Không tìm thấy phần tử sau ${FIND_ELEMENT_MAX_RETRIES} lần thử: ${target}`);
        useAgentStore.getState().sendSystemMessageRef?.(
          `[SYSTEM_HIDDEN] Click action failed: element "${target}" could not be found on the current page ` +
          `after waiting for it to render. Inform the user politely that this action could not be completed, ` +
          `TUYỆT ĐỐI KHÔNG CHÀO HỎI lại, chỉ xin lỗi ngắn gọn và gợi ý họ thực hiện thủ công hoặc thử lại.`
        );
        return;
      }
      timers.push(setTimeout(() => findElementWithRetry(attempt + 1), FIND_ELEMENT_RETRY_DELAY_MS));
    }

    function runClickSequence(el: HTMLElement) {
    // ── Kiểm tra scroll cần thiết trước khi animate cursor ─────────
    const computedStyle = window.getComputedStyle(el);
    const isHidden =
      computedStyle.opacity === "0" ||
      computedStyle.pointerEvents === "none" ||
      parseFloat(computedStyle.opacity) < 0.5;

    // Phần tử ngoài viewport (below hoặc above fold)
    const elRect = el.getBoundingClientRect();
    const isOutOfViewport = elRect.top > window.innerHeight || elRect.bottom < 0;

    // Quãng cuộn SIÊU DÀI (trang chủ hiện đã rất dài, vd cta_apply/cta_check_status cách top
    // ~7000px) → smooth-scroll không đáng tin cậy dưới tải headless (xem comment dài bên dưới,
    // đã đo bằng evidence trực tiếp: animation tự bị ngắt thành nhiều "đoạn" không thể đoán
    // trước). Quyết định kiến trúc (đã thống nhất): CHỈ quãng siêu dài mới nhảy tức thì
    // (behavior:"auto", không animation, 100% deterministic) — quãng ngắn (vd hidden-header
    // 120px) vẫn giữ smooth như cũ, không đổi UX cho trường hợp đó.
    const LONG_SCROLL_THRESHOLD_PX = 1500;

    const scrollYBefore = window.scrollY;
    let scrollReason: "none" | "hidden-header" | "out-of-viewport" = "none";
    let isInstantScroll = false;
    if (isHidden) {
      // Header ẩn tại scroll=0 → scroll nhẹ để trigger header reveal
      window.scrollTo({ top: 120, behavior: "smooth" });
      scrollReason = "hidden-header";
    } else if (isOutOfViewport) {
      // Phần tử dưới/trên fold → cuộn đến vị trí trung tâm viewport
      isInstantScroll = Math.abs(elRect.top) > LONG_SCROLL_THRESHOLD_PX;
      el.scrollIntoView({ behavior: isInstantScroll ? "auto" : "smooth", block: "center" });
      scrollReason = "out-of-viewport";
    }


    // BUG ĐÃ SỬA: trước đây chờ scroll xong bằng 1 con số cố định (700ms) cho MỌI trường hợp,
    // giả định mọi smooth-scroll đều xong trong thời gian đó. Trang chủ hiện đã rất dài (vd
    // cta_apply cách top ~7000px) → smooth scroll quãng SIÊU DÀI không kịp hoàn tất trong 700ms.
    //
    // ĐÃ THỬ và LOẠI BỎ: thay 700ms cố định bằng cơ chế "chờ tới khi thật sự ổn định" áp dụng
    // cho MỌI trường hợp (poll rect.top theo delta, rồi lắng nghe `scrollend` có debounce). Cả
    // hai đều khiến quãng NGẮN (hidden-header 120px, hoặc out-of-viewport bình thường vài trăm px
    // — vốn đã hoạt động ổn định với 700ms cố định từ trước) trở nên CHẬM HƠN/kém ổn định hơn,
    // làm fail ngược lại các test cũ (btn-apply-header, header_check_status, lang-selector,
    // check_status_submit, contact_submit, continue_to_apply — tất cả đều dùng nhánh quãng ngắn,
    // budget cursor-xuất-hiện 2000ms không đủ chờ scrollend/poll). Hoá ra root cause chỉ nằm ở
    // quãng SIÊU DÀI — sửa rộng hơn phạm vi cần thiết tạo ra regression mới.
    //
    // FIX ĐÚNG PHẠM VI: CHỈ quãng siêu dài mới đổi cơ chế (nhảy tức thì — isInstantScroll ở trên
    // — không có animation thì không có gì để chờ/ngắt). MỌI trường hợp khác (hidden-header, và
    // out-of-viewport quãng thường) GIỮ NGUYÊN 700ms cố định như code gốc — đã được tune đúng và
    // không có lý do gì để đổi khi chưa có evidence nó cũng có vấn đề.
    const SCROLL_DELAY_MS = 700;

    function afterScrollSettled() {
        if (activeIdRef.current !== currentId) return;

        const scrollYAfter = window.scrollY;

        x.set(window.innerWidth / 2);
        y.set(window.innerHeight / 2);
        setVisible(true);

        const t0 = performance.now();
        const ms = () => `${Math.round(performance.now() - t0)}ms`;

        // t+200ms: bắt đầu di chuyển (React đã mount m.div)
        timers.push(
          setTimeout(() => {
            if (activeIdRef.current !== currentId) return;
            // Đọc lại rect lần nữa phòng trường hợp layout shift
            const updatedRect = el.getBoundingClientRect();
            const targetX = updatedRect.left + updatedRect.width / 2;
            const targetY = updatedRect.top + updatedRect.height / 2;
            anims.push(animate(x, targetX, { duration: 0.8, ease: "easeInOut" }));
            anims.push(animate(y, targetY, { duration: 0.8, ease: "easeInOut" }));
          }, 200)
        );

        // t+900ms: hover effect — cursor gần đến button, giả lập hover state
        timers.push(
          setTimeout(() => {
            if (activeIdRef.current !== currentId) return;
            el.classList.add("ai-cursor-hover");
          }, 900)
        );

        // t+1050ms: giả lập nhấn chuột thật
        timers.push(
          setTimeout(() => {
            if (activeIdRef.current !== currentId) return;
            // Chuyển từ hover → press (CSS class thay thế Framer Motion animate trên DOM element)
            el.classList.remove("ai-cursor-hover");
            el.classList.add("ai-cursor-press");
            // Gỡ class sau khi animation hoàn tất (320ms)
            timers.push(setTimeout(() => el.classList.remove("ai-cursor-press"), 350));
            // Press animation trên cursor
            setIsClicking(true);
            timers.push(setTimeout(() => setIsClicking(false), 180));
            el.click();
          }, 1050)
        );

        if (vc.optionCode) {
          // Phase 2 focus_ui_field: field vừa được click mở (dropdown đã render) — tiếp tục tìm
          // và click option tương ứng. 1400ms = đủ thời gian cho click ở trên (1050ms) hoàn tất
          // + dropdown render xong (Radix Popover thường <100ms).
          timers.push(
            setTimeout(() => {
              if (activeIdRef.current !== currentId) return;
              runSelectSequence(vc.optionCode!);
            }, 1400)
          );
        } else {
          // t+1350ms: ẩn cursor (giữ nguyên hành vi cũ khi không cần chọn option)
          timers.push(
            setTimeout(() => {
              if (activeIdRef.current !== currentId) return;
              setVisible(false);
              setIsClicking(false);
              if (vc.intent && vc.sessionId) {
                reportActionSuccess({ session_id: vc.sessionId, intent: vc.intent, lang: vc.lang })
                  .catch((err) => console.error("[VirtualMouse] Failed to report action success:", err));
              }
            }, 1350)
          );
        }

        // PHASE 5 (Phase 2 focus_ui_field) — tìm option trong dropdown đã mở bằng `data-value`
        // (gắn ở Combobox.tsx), cuộn listbox nếu option ngoài viewport (KHÔNG virtualized — toàn
        // bộ option luôn trong DOM, chỉ ẩn bằng scroll), animate cursor tới đó, click thật.
        // Fallback: nếu không tìm thấy DOM node sau budget retry (label lệch/race condition) →
        // dispatch lại đúng cơ chế `ai_fill_form` mà QuickApplyFormFields.tsx đã có sẵn handler.
        function runSelectSequence(optionCode: string) {
          // Chỉ 'quick_apply_nationality' cần reverse-map ISO code → tên tiếng Anh hiển thị (data-value
          // của Combobox option là tên quốc gia, không phải mã ISO). 3 target Select mới (Phase 3 —
          // port/visa_option/processing_speed) dùng THẲNG optionCode làm data-value (vd "SGN",
          // "urgent-4d") — Gemini chọn đúng mã code, không qua tên hiển thị trung gian nào.
          const searchValue =
            vc.target === "quick_apply_nationality" ? getCountryNameByCode(optionCode) : optionCode;

          // fieldName cho fallback ai_fill_form — khớp đúng tên mà handler trong
          // QuickApplyFormFields.tsx đang lắng nghe (fieldName === "port"/"visaOption"/"speed"/"nationality"),
          // hoặc handler trong Step1VisaOptions.tsx (fieldName === "visa_type"/"visa_category"/...).
          const AI_FILL_FORM_FIELD_NAME: Record<string, string> = {
            quick_apply_nationality: "nationality",
            quick_apply_port: "port",
            quick_apply_visa_option: "visaOption",
            quick_apply_processing_speed: "speed",
            apply_step1_visa_type: "visa_type",
            apply_step1_visa_category: "visa_category",
            apply_step1_port_of_entry: "port_of_entry",
            apply_step1_purpose_of_visit: "purpose_of_visit",
            apply_step1_applicant_count: "applicant_count",
          };
          const fallbackFieldName = AI_FILL_FORM_FIELD_NAME[vc.target] ?? vc.target;

          // Step1VisaOptions.tsx's ai_fill_form handler chỉ xử lý khi detail.target === "step1_form"
          // (xem Step1VisaOptions.tsx dòng ~80) — QuickApplyFormFields.tsx không filter theo target nên
          // giữ nguyên hành vi cũ (không gửi field này) cho 4 target quick_apply_*.
          const isApplyStep1Target = vc.target.startsWith("apply_step1_");
          const fallbackDetail: { target?: string; fieldName: string; value: string } = isApplyStep1Target
            ? { target: "step1_form", fieldName: fallbackFieldName, value: searchValue }
            : { fieldName: fallbackFieldName, value: searchValue };

          function findOptionWithRetry(attempt: number) {
            if (activeIdRef.current !== currentId) return;
            const optionEl = document.querySelector(`[role="option"][data-value="${searchValue}"]`) as HTMLElement;
            if (optionEl) {
                clickOption(optionEl);
                return;
            }
            if (attempt >= FIND_OPTION_MAX_RETRIES) {
              console.warn(
                `[VirtualMouse] ⚠ Không tìm thấy option "${searchValue}" sau ${FIND_OPTION_MAX_RETRIES} ` +
                `lần thử — fallback set giá trị qua ai_fill_form.`
              );
              window.dispatchEvent(
                new CustomEvent("ai_fill_form", { detail: fallbackDetail })
              );
              timers.push(
                setTimeout(() => {
                  setVisible(false);
                  setIsClicking(false);
                }, 200)
              );
              return;
            }
            timers.push(setTimeout(() => findOptionWithRetry(attempt + 1), FIND_OPTION_RETRY_DELAY_MS));
          }

          function clickOption(optionEl: HTMLElement) {
            // Đưa option vào giữa khung nhìn TRƯỚC khi animate cursor tới — tái dùng đúng công thức
            // scroll-to-selected đã có trong Combobox.tsx (offsetTop - viewportHeight/2 + elementHeight/2).
            const viewport = optionEl.closest('[role="listbox"]') as HTMLElement | null;
            if (viewport) {
              const offsetTop = optionEl.offsetTop;
              const elementHeight = optionEl.offsetHeight;
              const viewportHeight = viewport.clientHeight;
              viewport.scrollTop = Math.max(0, offsetTop - viewportHeight / 2 + elementHeight / 2);
            }

            timers.push(
              setTimeout(() => {
                if (activeIdRef.current !== currentId) return;
                const rect = optionEl.getBoundingClientRect();
                anims.push(animate(x, rect.left + rect.width / 2, { duration: 0.5, ease: "easeInOut" }));
                anims.push(animate(y, rect.top + rect.height / 2, { duration: 0.5, ease: "easeInOut" }));
              }, 50)
            );

            timers.push(
              setTimeout(() => {
                if (activeIdRef.current !== currentId) return;
                optionEl.classList.add("ai-cursor-hover");
              }, 500)
            );

            timers.push(
              setTimeout(() => {
                if (activeIdRef.current !== currentId) return;
                optionEl.classList.remove("ai-cursor-hover");
                optionEl.classList.add("ai-cursor-press");
                timers.push(setTimeout(() => optionEl.classList.remove("ai-cursor-press"), 350));
                setIsClicking(true);
                timers.push(setTimeout(() => setIsClicking(false), 180));
                timers.push(
                  setTimeout(() => {
                    const rect = optionEl.getBoundingClientRect();
                    const center = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
                    optionEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, isPrimary: true, ...center }));
                    optionEl.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, isPrimary: true, ...center }));
                    optionEl.click();
                  }, 180)
                );
              }, 650)
            );

            timers.push(
              setTimeout(() => {
                if (activeIdRef.current !== currentId) return;
                setVisible(false);
                setIsClicking(false);
              }, 950)
            );
          }

          findOptionWithRetry(0);
        }
    }
    if (scrollReason === "none" || isInstantScroll) {
      // Không cần chờ gì: (a) không cần scroll, hoặc (b) đã nhảy tức thì (behavior:"auto")
      // — không có animation thì không có gì để chờ. Defer 1 tick để tránh setState đồng bộ
      // ngay trong cùng lượt render với findElementWithRetry.
      timers.push(setTimeout(afterScrollSettled, 0));
    } else {
      // hidden-header hoặc out-of-viewport quãng thường: giữ nguyên 700ms cố định như code gốc.
      timers.push(setTimeout(afterScrollSettled, SCROLL_DELAY_MS));
    }
    }

    findElementWithRetry(0);

    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.stop());
      activeEl?.classList.remove("ai-cursor-hover", "ai-cursor-press");
    };
  }, [virtualClick, x, y]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="virtual-cursor"
          data-testid="virtual-cursor"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            x,
            y,
            zIndex: 99999,
            pointerEvents: "none",
            translateX: "-3px",
            translateY: "-3px",
          }}
        >
          {/* Inner div xử lý press animation độc lập với fade-in/out */}
          <m.div
            animate={
              isClicking
                ? { scale: 0.72, rotate: -12 }
                : { scale: 1, rotate: 0 }
            }
            transition={
              isClicking
                ? { duration: 0.08, ease: "easeOut" }
                : { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] } // spring bounce khi nhả
            }
          >
            <MousePointer
              size={46}
              fill="white"
              stroke="#111827"
              strokeWidth={1.4}
            />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
