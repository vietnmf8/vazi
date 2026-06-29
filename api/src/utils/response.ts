import type { Response } from "express";
import { httpCodes } from "@/configs/constants";

/**
 * Bọc `res.success` để controller gọi một hàm thuần — giữ envelope `{ success, data, error }`.
 *
 * Dùng khi team muốn tách helper khỏi monkey-patch; middleware `response` vẫn là nguồn định dạng thật.
 *
 * @param res - Response đã qua `responseMiddleware`
 * @param data - Payload `data`
 * @param statusCode - HTTP status (mặc định 200)
 * @param message - Optional key hoặc chuỗi message (merge vào body qua `passProps`)
 */
export function sendSuccess(
    res: Response,
    data: unknown,
    statusCode: number = httpCodes.ok,
    message?: string,
): void {
    res.success(data, statusCode, message ? { message } : {});
}

/**
 * Phân trang một trang — meta khớp convention `14-response-i18n` (`current_page`, `per_page`, …).
 *
 * Công thức `from`/`to`: 1-based slice trên tổng `total`; khi rỗng thì `from` = 0.
 *
 * @param res - Response có `res.paginate`
 * @param data - Mảng bản ghi trang hiện tại
 * @param total - Tổng số bản ghi (toàn bộ query, không chỉ trang này)
 * @param page - Số trang 1-based
 * @param limit - Kích thước trang
 */
export function sendPaginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
): void {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const from = total === 0 ? 0 : (safePage - 1) * safeLimit + 1;
    const to = Math.min(safePage * safeLimit, total);
    const hasMore = safePage * safeLimit < total;

    res.paginate({
        rows: data,
        pagination: {
            current_page: safePage,
            per_page: safeLimit,
            total,
            from,
            to,
            has_more: hasMore,
        },
    });
}
