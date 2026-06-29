import { useState, useEffect, useRef, MutableRefObject } from "react";

// Bộ nhớ đệm chiều cao nằm ngoài Component để không bị mất khi re-render
const heightCache = new Map<string | number, number>();

/**
 * Hook đo chiều cao thực tế của phần tử bằng ResizeObserver.
 * Lưu trữ chiều cao vào bộ nhớ đệm (Cache) bên ngoài.
 */
export function useMeasureHeight(id: string | number): [MutableRefObject<HTMLDivElement | null>, number] {
    const measureRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState(heightCache.get(id) || 0);

    useEffect(() => {
        const el = measureRef.current;
        if (!el) return;

        /* Lấy kích thước chính xác đến số thập phân */
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newHeight = entry.contentRect.height;
                if (newHeight > 0 && newHeight !== heightCache.get(id)) {
                    // Lưu vào cache và cập nhật state
                    heightCache.set(id, newHeight);
                    setHeight(newHeight);
                }
            }
        });

        resizeObserver.observe(el);
        return () => resizeObserver.disconnect();
    }, [id]);

    return [measureRef, height];
}
