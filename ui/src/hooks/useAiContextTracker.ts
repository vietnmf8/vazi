"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";

export function useAiContextTracker() {
    const setVisibleAiContexts = useAgentStore((state) => state.setVisibleAiContexts);

    useEffect(() => {
        const visibleElements = new Set<Element>();
        let timeoutId: NodeJS.Timeout;

        const updateContexts = () => {
            const contexts: any[] = [];
            
            // Sort elements by DOM order to keep it consistent
            const sortedElements = Array.from(visibleElements).sort((a, b) => {
                if (a === b) return 0;
                if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
                return 1;
            });

            for (const el of sortedElements) {
                const id = el.getAttribute("data-ai-id") || undefined;
                const desc = el.getAttribute("data-ai-desc") || undefined;
                const type = el.getAttribute("data-ai-type") || undefined;
                const action = el.getAttribute("data-ai-action") || undefined;
                const field = el.getAttribute("data-ai-field") || undefined;

                if (id || field) {
                    const fieldEls = el.querySelectorAll("[data-ai-field]");
                    const childFields = Array.from(fieldEls)
                        .map(f => f.getAttribute("data-ai-field"))
                        .filter(Boolean) as string[];
                    
                    const item: any = {};
                    if (id) item.id = id;
                    if (type) item.type = type;
                    if (action) item.action = action;
                    if (desc) item.desc = desc;
                    if (field) item.field = field;
                    if (childFields.length > 0) item.fields = childFields;

                    contexts.push(item);
                }
            }
            setVisibleAiContexts(contexts);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                let changed = false;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        visibleElements.add(entry.target);
                        changed = true;
                    } else {
                        if (visibleElements.has(entry.target)) {
                            visibleElements.delete(entry.target);
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(updateContexts, 100); // debounce updates
                }
            },
            {
                root: null,
                rootMargin: "-25% 0px -25% 0px",
                threshold: 0.1, // trigger early enough when element is slightly visible
            }
        );

        // Track observed elements to avoid re-observing
        const observedElements = new Set<Element>();

        // Observe elements
        const observeElements = () => {
            // Only track elements inside the main content area to avoid noise from headers/footers
            const elements = document.querySelectorAll("[data-ai-id], [data-ai-field]");
            elements.forEach((el) => {
                const id = el.getAttribute("data-ai-id");
                if (id === "header" || id === "footer" || id === "chat-widget") return;
                
                if (!observedElements.has(el)) {
                    observer.observe(el);
                    observedElements.add(el);
                }
            });
        };

        // Initial observe
        observeElements();

        // Re-observe when DOM changes (e.g. navigation, new elements)
        const mutationObserver = new MutationObserver(() => {
            observeElements();
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
            clearTimeout(timeoutId);
        };
    }, [setVisibleAiContexts]);
}
