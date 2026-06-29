import { httpCodes } from "@/configs/constants";

/**
 * Lỗi nghiệp vụ có HTTP status — `errorHandler` map sang envelope mà không cần `instanceof Error` lung tung.
 */
export class AppError extends Error {
    readonly statusCode: number;
    readonly code?: string;

    constructor(message: string, statusCode: number = httpCodes.serverError, code?: string) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

/**
 * 422 + chi tiết field — dùng sau middleware Zod hoặc validate thủ công.
 * HTTP 422 Unprocessable Entity phù hợp hơn 400 cho lỗi validate dữ liệu đầu vào.
 */
export class ValidationError extends AppError {
    readonly fields?: Record<string, string[]>;

    constructor(
        message: string,
        fields?: Record<string, string[]>,
        code = "VALIDATION_ERROR",
    ) {
        super(message, httpCodes.unprocessableEntity, code);
        this.name = "ValidationError";
        this.fields = fields;
    }
}

/** 401 — chưa đăng nhập hoặc token hết hạn. */
export class UnauthorizedError extends AppError {
    constructor(message: string) {
        super(message, httpCodes.unauthorized, "UNAUTHORIZED");
        this.name = "UnauthorizedError";
    }
}

/** 403 — đã biết danh tính nhưng không đủ quyền. */
export class ForbiddenError extends AppError {
    constructor(message: string) {
        super(message, httpCodes.forbidden, "FORBIDDEN");
        this.name = "ForbiddenError";
    }
}

/** 404 — tài nguyên không tồn tại hoặc bị ẩn. */
export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, httpCodes.notFound, "NOT_FOUND");
        this.name = "NotFoundError";
    }
}

/**
 * 409 — vi phạm unique hoặc conflict nghiệp vụ.
 *
 * `message` mặc định là i18n key; errorHandler / FE dịch sau khi có `req.t`.
 */
export class ConflictError extends AppError {
    constructor(message = "errors.conflict") {
        super(message, httpCodes.conflict, "CONFLICT");
        this.name = "ConflictError";
    }
}
