/**
 * Virtual Mouse Engine — Browser Timing Test
 *
 * Dán vào DevTools Console tại localhost:3000 để chạy.
 *
 * Kiểm tra 4 phase tuần tự với ±150ms tolerance:
 *   PHASE 1  t≈0ms    — cursor xuất hiện giữa màn hình (MutationObserver)
 *   PHASE 2  t≈200ms  — cursor bắt đầu di chuyển (getBoundingClientRect poll)
 *   PHASE 3  t≈1050ms — element.click() thật (capture-phase listener)
 *   PHASE 4  t≈1350ms — cursor ẩn / fade-out bắt đầu (setVisible(false))
 *   EXIT     t≈1550ms — DOM node xóa sau khi exit animation xong (MutationObserver)
 *
 * Chạy: (paste toàn bộ vào Console → Enter)
 */
(async function VirtualMouseTest() {
  /* ── helpers ─────────────────────────────────────────── */
  const GREEN   = 'color:#22c55e;font-weight:bold';
  const RED     = 'color:#ef4444;font-weight:bold';
  const YELLOW  = 'color:#eab308;font-weight:bold';
  const CYAN    = 'color:#06b6d4;font-weight:bold';
  const DIM     = 'color:#6b7280';
  const BOLD    = 'font-weight:bold';

  const TOLERANCE = 150; // ms

  let passed = 0;
  let failed = 0;

  function log(msg, style = '')        { console.log(`%c${msg}`, style); }
  function pass(label, actual, expect) {
    passed++;
    console.log(`%c  ✅ PASS%c — ${label} | actual=${Math.round(actual)}ms expect≈${expect}ms (Δ${Math.round(Math.abs(actual - expect))}ms)`, GREEN, '');
  }
  function fail(label, actual, expect, note = '') {
    failed++;
    console.log(`%c  ❌ FAIL%c — ${label} | actual=${Math.round(actual)}ms expect≈${expect}ms (Δ${Math.round(Math.abs(actual - expect))}ms) ${note}`, RED, '');
  }
  function assertTiming(label, actualMs, expectMs) {
    Math.abs(actualMs - expectMs) <= TOLERANCE ? pass(label, actualMs, expectMs) : fail(label, actualMs, expectMs, `(tolerance ±${TOLERANCE}ms exceeded)`);
  }
  function sep(ch = '─', n = 60) { console.log(ch.repeat(n)); }

  /* ── precondition checks ─────────────────────────────── */
  sep('═');
  log('🖱️  Virtual Mouse Engine — Browser Timing Test', BOLD);
  log(`Tolerance: ±${TOLERANCE}ms per phase`, DIM);
  sep('═');

  // 1) Zustand store
  const store = window.__NEXT_STORE__?.agentStore || window.useAgentStore?.getState?.();
  // Try multiple ways to access the store
  let triggerVirtualClick = null;
  try {
    // Next.js dev: stores are exposed if window.__STORES__ exists, else try direct import via __next_f
    // Most reliable: check if the store is accessible
    const zustandMod = window.__zustand_stores__;
    if (zustandMod?.agentStore) {
      triggerVirtualClick = zustandMod.agentStore.getState().triggerVirtualClick;
    }
  } catch {}

  if (!triggerVirtualClick) {
    // Fallback: try to find agentStore on window (if exposed in dev)
    for (const key of Object.keys(window)) {
      try {
        if (window[key]?.getState?.()?.triggerVirtualClick) {
          triggerVirtualClick = window[key].getState().triggerVirtualClick;
          break;
        }
      } catch {}
    }
  }

  if (!triggerVirtualClick) {
    // Last resort: use React DevTools fiber to find the store
    log('⚠️  Không tìm thấy agentStore trực tiếp — thử cách thủ công...', YELLOW);
    log('   Chạy lệnh sau trước:\n   window._vc = () => { const s = [...document.querySelectorAll("[data-reactroot]")].map(el => { try { return Object.values(el)[0]?.memoizedState; } catch{} }); }', DIM);
    log('', '');
    log('📌 Fallback: Test sẽ trigger thủ công qua dispatch event', DIM);
  }

  // 2) Apply Now button
  const applyBtn = document.querySelector('[data-ai-element="btn-apply-header"]');
  if (!applyBtn) {
    log('❌ PRECONDITION FAIL: [data-ai-element="btn-apply-header"] không có trong DOM.', RED);
    log('   Hãy mở trang chủ (/) trước khi chạy test này.', YELLOW);
    return;
  }
  log(`✅ Precondition: Tìm thấy [data-ai-element="btn-apply-header"] tại (${Math.round(applyBtn.getBoundingClientRect().left)}, ${Math.round(applyBtn.getBoundingClientRect().top)})`, 'color:#22c55e');

  /* ── setup observers ─────────────────────────────────── */

  const results = {};
  let t0 = null;
  let pollingId = null;
  let lastCursorPos = null;
  let phase2Detected = false;
  let phase3Detected = false;
  let phase4Detected = false;

  // Promise resolvers cho từng phase
  const phaseResolvers = {};
  const phasePromises = {};
  ['P1_APPEAR', 'P2_MOVE', 'P3_CLICK', 'P4_HIDE', 'EXIT_DOM'].forEach(k => {
    phasePromises[k] = new Promise(res => { phaseResolvers[k] = res; });
  });

  // MutationObserver — detect cursor xuất hiện và biến mất
  const CURSOR_SELECTOR = '[style*="z-index: 99999"], [style*="z-index:99999"]';
  let cursorEl = null;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      // Check added nodes — cursor appear
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        // VirtualMouseEngine renders m.div với position:fixed và zIndex:99999
        const el = node.matches?.('[style*="z-index"]') ? node : node.querySelector?.('[style*="z-index"]');
        const target = el || node;
        if (target?.style?.zIndex === '99999' || target?.style?.position === 'fixed') {
          cursorEl = target;
          if (!t0) t0 = performance.now(); // đây chính là t=0
          const elapsed = performance.now() - t0;
          results.P1_APPEAR = elapsed;
          console.log(`%c[VirtualMouseTest] ▶ PHASE 1 DETECT | t=${Math.round(elapsed)}ms | Cursor DOM xuất hiện`, CYAN);
          phaseResolvers['P1_APPEAR'](elapsed);
          startPositionPolling();
        }
      }
      // Check removed nodes — exit animation done
      for (const node of m.removedNodes) {
        if (node.nodeType !== 1) continue;
        if (node === cursorEl || node.contains?.(cursorEl) || node.style?.zIndex === '99999') {
          const elapsed = t0 ? performance.now() - t0 : 0;
          results.EXIT_DOM = elapsed;
          console.log(`%c[VirtualMouseTest] ▶ EXIT DOM DETECT | t=${Math.round(elapsed)}ms | Cursor DOM xóa (exit anim xong)`, CYAN);
          phaseResolvers['EXIT_DOM'](elapsed);
          if (pollingId) { clearInterval(pollingId); pollingId = null; }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Click capture — phase 3
  const clickCapture = (e) => {
    if (e.target === applyBtn || applyBtn.contains(e.target)) {
      if (!phase3Detected) {
        phase3Detected = true;
        const elapsed = t0 ? performance.now() - t0 : 0;
        results.P3_CLICK = elapsed;
        console.log(`%c[VirtualMouseTest] ▶ PHASE 3 DETECT | t=${Math.round(elapsed)}ms | element.click() captured`, CYAN);
        phaseResolvers['P3_CLICK'](elapsed);
      }
    }
  };
  document.addEventListener('click', clickCapture, { capture: true });

  // Visibility polling — phase 4 (cursor starts fading out)
  // Dùng MutationObserver attribute để detect khi opacity thay đổi
  function startPositionPolling() {
    if (!cursorEl) return;
    const btnRect = applyBtn.getBoundingClientRect();
    const targetX = btnRect.left + btnRect.width / 2;
    const targetY = btnRect.top + btnRect.height / 2;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    const MOVE_THRESHOLD = 20; // px — cursor phải di chuyển ít nhất X px so với center

    lastCursorPos = { x: startX, y: startY };

    pollingId = setInterval(() => {
      if (!cursorEl || !t0) return;

      const rect = cursorEl.getBoundingClientRect();
      const curX = rect.left + rect.width / 2;
      const curY = rect.top + rect.height / 2;

      // Phase 2: cursor bắt đầu rời khỏi center
      if (!phase2Detected) {
        const distFromCenter = Math.sqrt((curX - startX) ** 2 + (curY - startY) ** 2);
        if (distFromCenter > MOVE_THRESHOLD) {
          phase2Detected = true;
          const elapsed = performance.now() - t0;
          results.P2_MOVE = elapsed;
          console.log(`%c[VirtualMouseTest] ▶ PHASE 2 DETECT | t=${Math.round(elapsed)}ms | Cursor bắt đầu di chuyển (dist=${Math.round(distFromCenter)}px từ center)`, CYAN);
          phaseResolvers['P2_MOVE'](elapsed);
        }
      }

      // Phase 4: opacity < 0.5 (framer-motion đang fade out)
      if (!phase4Detected && phase3Detected) {
        const opacity = parseFloat(window.getComputedStyle(cursorEl).opacity ?? '1');
        if (opacity < 0.5) {
          phase4Detected = true;
          const elapsed = performance.now() - t0;
          results.P4_HIDE = elapsed;
          console.log(`%c[VirtualMouseTest] ▶ PHASE 4 DETECT | t=${Math.round(elapsed)}ms | Cursor fade-out (opacity=${opacity.toFixed(2)})`, CYAN);
          phaseResolvers['P4_HIDE'](elapsed);
        }
      }

      lastCursorPos = { x: curX, y: curY };
    }, 16); // ~60fps
  }

  /* ── trigger ─────────────────────────────────────────── */
  sep();
  log('🚀 Triggering triggerVirtualClick("btn-apply-header")...', BOLD);
  sep();

  t0 = performance.now();

  if (triggerVirtualClick) {
    triggerVirtualClick('btn-apply-header');
  } else {
    // Dispatch custom event nếu store không accessible trực tiếp
    // User phải chạy thủ công trong console:
    log('⚠️  Không tự trigger được. Hãy chạy thủ công trong console:', YELLOW);
    log('   useAgentStore.getState().triggerVirtualClick("btn-apply-header")', DIM);
    log('   (sau đó observer sẽ tự detect)', DIM);
    // Reset t0 — sẽ được set lại khi MutationObserver detect cursor
    t0 = null;
    log('⏳ Đang chờ cursor xuất hiện trong DOM (timeout 5s)...', DIM);
  }

  /* ── wait for all phases ─────────────────────────────── */
  const TIMEOUT = 3000; // ms — đủ cho toàn bộ animation (1550ms) + buffer

  function withTimeout(promise, ms, name) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT: ${name} không detect được sau ${ms}ms`)), ms)),
    ]);
  }

  try {
    await withTimeout(phasePromises['P1_APPEAR'], TIMEOUT, 'PHASE 1');
    await withTimeout(phasePromises['P2_MOVE'], TIMEOUT, 'PHASE 2');
    await withTimeout(phasePromises['P3_CLICK'], TIMEOUT, 'PHASE 3');
    // P4 và EXIT có thể detect muộn hơn nếu opacity polling chậm
    await withTimeout(
      Promise.race([phasePromises['P4_HIDE'], phasePromises['EXIT_DOM']]),
      TIMEOUT,
      'PHASE 4 / EXIT'
    );
    // Đợi thêm 300ms để EXIT_DOM có thể settle
    await new Promise(r => setTimeout(r, 300));
  } catch (err) {
    log(`\n⚠️  ${err.message}`, YELLOW);
  } finally {
    observer.disconnect();
    document.removeEventListener('click', clickCapture, { capture: true });
    if (pollingId) clearInterval(pollingId);
  }

  /* ── report ──────────────────────────────────────────── */
  sep('═');
  log('📊 KẾT QUẢ TIMING TEST', BOLD);
  sep('═');

  if (results.P1_APPEAR !== undefined) {
    assertTiming('PHASE 1 — Cursor xuất hiện (DOM inserted)', results.P1_APPEAR, 0);
  } else {
    fail('PHASE 1 — Cursor xuất hiện (DOM inserted)', Infinity, 0, '(không detect được)');
  }

  if (results.P2_MOVE !== undefined) {
    assertTiming('PHASE 2 — Cursor bắt đầu di chuyển', results.P2_MOVE, 200);
  } else {
    fail('PHASE 2 — Cursor bắt đầu di chuyển', Infinity, 200, '(không detect được)');
  }

  if (results.P3_CLICK !== undefined) {
    assertTiming('PHASE 3 — element.click() thật', results.P3_CLICK, 1050);
  } else {
    fail('PHASE 3 — element.click() thật', Infinity, 1050, '(không detect được)');
  }

  if (results.P4_HIDE !== undefined) {
    assertTiming('PHASE 4 — Cursor fade-out bắt đầu', results.P4_HIDE, 1350);
  } else if (results.EXIT_DOM !== undefined) {
    // Nếu không detect opacity, dùng DOM removal làm proxy (exit anim ~200ms sau setVisible false)
    assertTiming('PHASE 4 — Cursor DOM removed (proxy cho fade-out)', results.EXIT_DOM, 1550);
  } else {
    fail('PHASE 4 — Cursor ẩn', Infinity, 1350, '(không detect được)');
  }

  sep('─');
  const total = passed + failed;
  if (failed === 0) {
    log(`✅ TẤT CẢ PASS — ${passed}/${total} assertions — Virtual Mouse timing chính xác!`, GREEN);
  } else {
    log(`❌ KẾT QUẢ: ${passed}/${total} PASS — ${failed} FAIL`, RED);
    log('Tip: Kiểm tra console.log [VirtualMouse] PHASE để so sánh timing thực tế từ component.', YELLOW);
  }
  sep('═');

  return results;
})();
