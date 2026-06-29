import { useState, useEffect, useRef, MutableRefObject } from "react";

/**
 * Theo dõi xem phần tử có nằm trong Viewport hoặc Vùng đệm không.
 * @param bufferZone Vùng đệm ảo, mặc định 1000px.
 */
export function useInView(bufferZone: string = "1000px"): [MutableRefObject<HTMLDivElement | null>, boolean] {
    const [inView, setInView] = useState(true);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setInView(entry.isIntersecting);
            },
            {
                rootMargin: `${bufferZone} 0px`,
                threshold: 0,
            },
        );

        observer.observe(el);
        return () => observer.unobserve(el);
    }, [bufferZone]);

    return [ref, inView];
}
