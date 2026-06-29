---
name: react-list-performance
description: Use when React list/chat/feed components show lag, jitter, or dropped frames during scroll, streaming, or high-frequency updates. Covers render storms, observer churn, hot-path pollution, and timer accumulation — 10 anti-patterns with exact fixes.
---

# React List & High-Frequency UI Performance

## Overview

High-frequency UIs (chat, live feeds, virtualized lists) fail from **compounding micro-inefficiencies**. One message arriving can simultaneously trigger: a render storm (all N components re-render), observer churn (3 observers teardown + reconnect), and 8+ console.log calls blocking the frame. Each issue alone is manageable — together they cause visible lag and jitter.

## When to Use

- Chat/list component lags when messages arrive or stream
- Typing indicators or suggestions cause all items to re-render
- Scroll performance degrades as item count grows
- Chrome DevTools shows Long Tasks (>50ms) during routine interactions
- Console floods with debug logs during scroll or streaming
- Adding `React.memo` alone doesn't fix the lag

## Anti-Pattern Quick Reference

| # | Anti-Pattern | Root Cause | Fix |
|---|-------------|-----------|-----|
| 1 | `setState` in render body | Double render cascade | Move to `useEffect` |
| 2 | No `React.memo` on list items | All N items re-render on parent state change | `memo` + custom comparator |
| 3 | `setInterval` per component instance | N × 1 setState/sec with N items | `setTimeout` fired once at expiry |
| 4 | Frequently-changing data in observer `useEffect` deps | Observer disconnect+reconnect every update | Use refs; prefer stable deps (e.g. `phase`) |
| 5 | State value inside ResizeObserver deps | Reconnect loop on each measurement | Compare against module-level Map cache |
| 6 | `console.log` inside scroll/observer callbacks | Synchronous I/O blocks rendering frames | Remove all debug logs from production |
| 7 | `indexOf` inside `.map()` render loop | O(n²) — 100 items = 10,000 operations per render | Compute global index from loop `idx` directly |
| 8 | `[...arr].reverse().find()` | Full array copy + traversal each render | Reverse `for` loop with `break` |
| 9 | `JSON.stringify` for equality check | Serialize entire structure each comparison | `length` + per-element reference check |
| 10 | `transition-all` on virtualized container | GPU composites ALL CSS properties | Remove or use specific property |

---

## Fix Patterns

### Anti-Pattern 1: setState during render

```typescript
// ❌ BAD: setState in render body → double render every time parent re-renders
if (message.translatedText !== prevTranslatedText) {
    setPrevTranslatedText(message.translatedText); // called during render!
    setShowTranslation(true);
}

// ✅ GOOD: useEffect fires after render — single render cycle
useEffect(() => {
    if (message.translatedText) {
        setShowTranslation(true);
    }
}, [message.translatedText]);
// Remove prevTranslatedText state entirely
```

**Tricky variant — "prevState" pattern:**
```typescript
// ❌ BAD: prevXxx state + render-body comparison is always setState-during-render
const [prevMessages, setPrevMessages] = useState([]);
if (messages !== prevMessages) {
    setPrevMessages(messages);          // ← causes double render
    setVisibleCount(v => v + addedCount);
}

// ✅ GOOD: useRef for previous value, useEffect for comparison
const prevMessagesRef = useRef([]);
useEffect(() => {
    const prev = prevMessagesRef.current;
    if (messages.length > prev.length) {
        setVisibleCount(v => v + (messages.length - prev.length));
    }
    prevMessagesRef.current = messages;
}, [messages]);
```

---

### Anti-Pattern 2: Missing React.memo

```typescript
// ❌ BAD: No memo — every parent re-render causes all N items to re-render
export function ChatMessage({ message, phase }: Props) { ... }

// ✅ GOOD: memo + comparator checking only fields that affect rendering
function ChatMessageInner({ message, phase, replyToMessage }: Props) { ... }

export const ChatMessage = React.memo(
    ChatMessageInner,
    (prev, next) =>
        prev.message.id === next.message.id &&
        prev.message.message === next.message.message &&
        prev.message.isStreaming === next.message.isStreaming &&
        prev.message.translatedText === next.message.translatedText &&
        prev.message.isTranslating === next.message.isTranslating &&
        prev.message.delivery_status === next.message.delivery_status &&
        prev.message.file_url === next.message.file_url &&
        prev.message.card === next.message.card &&
        prev.phase === next.phase &&
        prev.replyToMessage === next.replyToMessage,
);
// ⚠️ Callback props (onSend, onReply...) excluded — parent MUST wrap with useCallback
```

---

### Anti-Pattern 3: setInterval per instance

```typescript
// ❌ BAD: 20 USER messages = 20 intervals × 1 setState/sec = 20 re-renders/sec forever
const check = () => {
    const diff = Date.now() - new Date(timestamp).getTime();
    setCanRevoke(diff < WINDOW);
};
check();
const interval = setInterval(check, 1000); // N intervals running simultaneously
return () => clearInterval(interval);

// ✅ GOOD: compute remaining time once, fire exactly when window expires
const timeDiff = Date.now() - new Date(timestamp).getTime();
const WINDOW = 2 * 60 * 1000;

if (timeDiff >= WINDOW) {
    setCanRevoke(false);
    return; // already expired — no timer needed
}

setCanRevoke(true);
const remaining = WINDOW - timeDiff;
const id = setTimeout(() => setCanRevoke(false), remaining); // fires once
return () => clearTimeout(id);
```

---

### Anti-Pattern 4: Frequently-changing data in observer useEffect deps

```typescript
// ❌ BAD: messages changes every streaming chunk → all observers disconnect+reconnect
useEffect(() => {
    const listener = () => { ... };
    const ro1 = new ResizeObserver(...);
    const ro2 = new ResizeObserver((entries) => {
        const lastMsg = messages[messages.length - 1]; // closure over messages
        ...
    });
    scrollEl.addEventListener("scroll", listener);
    ro1.observe(scrollEl);
    ro2.observe(contentEl);
    return () => { scrollEl.removeEventListener(...); ro1.disconnect(); ro2.disconnect(); };
}, [messages, showTyping, delayId, updateThumb, handleScroll]); // ← unstable

// ✅ GOOD: break messages out of deps via ref, use stable deps
const messagesRef = useRef(messages);
useEffect(() => { messagesRef.current = messages; }); // sync every render, no deps

useEffect(() => {
    const ro2 = new ResizeObserver(() => {
        const lastMsg = messagesRef.current[messagesRef.current.length - 1]; // ref!
        ...
    });
    ...
}, [phase, updateThumb, handleScroll]); // phase changes rarely (join/handoff/survey)
```

---

### Anti-Pattern 5: State value inside ResizeObserver useEffect deps

```typescript
// ❌ BAD: height in deps → ResizeObserver reconnects on every measurement (reconnect loop)
const [height, setHeight] = useState(0);
useEffect(() => {
    const ro = new ResizeObserver(entries => {
        const newHeight = entries[0].contentRect.height;
        if (newHeight !== height) setHeight(newHeight); // triggers effect re-run!
    });
    ro.observe(el);
    return () => ro.disconnect();
}, [id, height]); // ← height change re-runs effect → disconnect → reconnect → measure → repeat

// ✅ GOOD: module-level Map cache breaks the cycle — compare against cache, not state
const heightCache = new Map<string | number, number>();

useEffect(() => {
    setHeight(heightCache.get(id) ?? 0); // reset on id change
    const ro = new ResizeObserver(entries => {
        const entry = entries[0]; if (!entry) return;
        const newHeight = entry.contentRect.height;
        // guard > 0: zero appears during unmount/incomplete layout
        if (newHeight > 0 && newHeight !== heightCache.get(id)) {
            heightCache.set(id, newHeight);
            setHeight(newHeight); // updates state but does NOT re-run this effect
        }
    });
    ro.observe(el);
    return () => ro.disconnect();
}, [id]); // only re-run when id changes — not on every measurement
```

---

### Anti-Pattern 6: console.log in hot paths

```typescript
// ❌ BAD: synchronous I/O inside scroll handler, IntersectionObserver, ResizeObserver
const observer = new IntersectionObserver(([entry]) => {
    setInView(entry.isIntersecting);
    console.log(`[useInView] Element ${el.id} inView = ${entry.isIntersecting}`); // ← blocks
});

scrollEl.addEventListener("scroll", () => {
    updateThumb();
    console.log(`[ChatWindow] scrollTop: ${scrollEl.scrollTop}`); // ← blocks every frame
    handleScroll();
});

// ✅ GOOD: remove debug logs before production. Use Chrome DevTools Performance
// panel instead — no code changes needed, doesn't affect execution timing
```

---

### Anti-Pattern 7: indexOf in render loop → O(n²)

```typescript
// ❌ BAD: indexOf is O(n) called for EVERY item → O(n²) total
renderedMessages.map((msg, idx) => {
    const prev = activeList[activeList.indexOf(msg) - 1]; // O(n) per iteration!
    const showSeparator = !prev || !isSameDay(msg.timestamp, prev.timestamp);
    ...
})

// ✅ GOOD: renderedMessages is always a slice from the end of activeList
// global index = offset + local index — O(1) per item
renderedMessages.map((msg, idx) => {
    const globalIdx = activeList.length - renderedMessages.length + idx;
    const prev = activeList[globalIdx - 1]; // O(1)
    const showSeparator = !prev || !isSameDay(msg.timestamp, prev.timestamp);
    ...
})
```

---

### Anti-Pattern 8: Array copy + reverse traversal

```typescript
// ❌ BAD: allocates copy of entire array, then may traverse entire array
const lastAi = [...messages].reverse().find(m => m.sender === "AI");

// ✅ GOOD: no allocation, breaks on first match from end — O(k) where k ≈ 1
let lastAi: Message | undefined;
for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === "AI") { lastAi = messages[i]; break; }
}
```

---

### Anti-Pattern 9: JSON.stringify for equality

```typescript
// ❌ BAD: serializes entire array every render
if (JSON.stringify(currentSuggestions) !== JSON.stringify(prevSuggestions)) { ... }

// ✅ GOOD: short-circuit on length, then reference compare per element — O(n) worst case
const changed =
    current.length !== prev.length ||
    current.some((item, i) => item !== prev[i]);
if (changed) { ... }
```

---

### Anti-Pattern 10: transition-all on virtualized containers

```typescript
// ❌ BAD: forces GPU composite pass for ALL CSS properties on every render
<div className="w-full transition-all duration-150" style={{ minHeight }}>

// ✅ GOOD: no transition (layout shift from virtualization is intentional)
<div className="w-full" style={{ minHeight }}>

// Or if animation is needed, scope to the specific property:
<div className="w-full transition-[min-height] duration-150" style={{ minHeight }}>
```

---

## Virtualization Pattern

For lists with 50+ items — show instantly, delay hide only:

```typescript
const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
    if (inView) {
        // Show immediately — cancel any pending hide
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
        setShouldRender(true);
    } else {
        // Delay hide — gives IntersectionObserver time to settle, prevents flicker
        hideTimerRef.current = setTimeout(() => {
            setShouldRender(false);
            hideTimerRef.current = null;
        }, 150);
    }
    return () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };
}, [inView]);

// IMPORTANT: start inView = true to prevent flash on initial mount
const [inView, setInView] = useState(true); // not false!
```

---

## Stabilizing Callbacks with Refs

When callbacks passed to `useCallback` depend on frequently-changing state:

```typescript
// Sync current values to refs in the render body (not in useEffect)
activeListLengthRef.current = activeList.length;
isLoadingRef.current = isLoading;
visibleCountRef.current = visibleCount;

// Callback reads refs → stable empty deps → observer never re-setups
const handleScroll = useCallback(() => {
    if (scrollTop <= 5 && visibleCountRef.current < activeListLengthRef.current
        && !isLoadingRef.current) { ... }
}, []); // ← stable forever

// ⚠️ Guard any requestAnimationFrame callback against unmount
requestAnimationFrame(() => {
    if (!containerRef.current) return; // component may have unmounted
    containerEl.scrollTop = newScrollTop;
    setIsLoading(false);
});
```

---

## Diagnostic Checklist

Before profiling, scan for these in list/chat components:

- [ ] `console.log` inside scroll handler, ResizeObserver, or IntersectionObserver callbacks?
- [ ] `setInterval` created per component instance?
- [ ] List item component wrapped in `React.memo` with custom comparator?
- [ ] Observer `useEffect` deps include `messages`, `data`, or other frequently-changing arrays?
- [ ] Any `useState` value in `useEffect` deps that also gets updated inside that effect?
- [ ] `indexOf`, `.find()`, `.filter()`, or `.reverse()` inside `.map()` in JSX?
- [ ] `JSON.stringify` used for equality comparison?
- [ ] `setState` called directly in the render body (outside `useEffect` / event handlers)?
- [ ] `transition-all` on virtualized/animated containers?
- [ ] `inView` initial state set to `false` in virtualization hook?

## Common Mistakes

**Memo comparator missing fields:** Forgetting `file_url`, `card`, or other rendered-but-data fields means stale renders when those fields change.

**Callbacks excluded from memo comparator:** Safe only if parent uses `useCallback`. Add a comment documenting this contract.

**Ref sync order matters:** When two `useEffect` blocks both depend on refs synced in the render body, React runs them in declaration order. Don't reorder them without checking.

**Suggestions/derived state pattern:** Moving render-body setState to `useEffect` is correct, but also add a separate `useEffect` to reset accumulated state (like `prevRef.current = []`) when a key dep like `sessionId` changes.

**localStorage in catch block:** After `JSON.parse` fails on a corrupted key, always `removeItem` before falling back — otherwise the error repeats on every render.
