/**
 * Mã HTTP dùng chung — gom một chỗ để middleware response/error không magic number.
 *
 * `as const` giữ literal type cho từng mã; khi gán biến `status: number` cần ép rộng ở call site.
 */
export const httpCodes = {
    ok: 200,
    created: 201,
    noContent: 204,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    payloadTooLarge: 413,
    unprocessableEntity: 422,
    /** Giới hạn tần suất (chat USER → AI). */
    tooManyRequests: 429,
    badGateway: 502,
    serviceUnavailable: 503,
    serverError: 500,
} as const;

/**
 * Model AI mặc định dùng cho toàn bộ dự án để tiết kiệm chi phí
 */
export const GEMINI_MODEL = 'gemini-flash-lite-latest';
