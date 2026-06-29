/**
 * Payload user tối thiểu gắn vào request sau khi xác thực.
 *
 * Dùng type tạm — Stage 1 Step 2 sẽ align với model Prisma `User`.
 */
export type AuthUser = {
    id: string;
    email: string;
    role: string;
};

/**
 * Ngữ cảnh auth đầy đủ (user + token + payload decode) để controller không tự parse JWT lặp lại.
 */
export type AuthContext = {
    user: AuthUser;
    accessToken: string;
    tokenPayload: {
        sub: string;
        role: string;
        iat: number;
        exp: number;
    };
};

declare global {
    namespace Express {
        interface Request {
            /** Set bởi middleware auth khi request đã đăng nhập */
            auth?: AuthContext;
        }
    }
}

export {};
