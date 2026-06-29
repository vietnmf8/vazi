import type { Request, Response } from "express";

import { httpCodes } from "@/configs/constants";
import { loginUser } from "@/services/auth.service";
import type { LoginBodyDto } from "@/validators/auth.validator";
import { getPusher } from "@/lib/pusher-client";

/** POST /auth/login */
export async function postAuthLogin(
    req: Request<unknown, unknown, LoginBodyDto>,
    res: Response,
): Promise<void> {
    const data = await loginUser(req.body);
    res.success(data, httpCodes.ok);
}

/** POST /auth/register */
export async function postAuthRegister(
    req: Request<unknown, unknown, import("@/validators/auth.validator").RegisterBodyDto>,
    res: Response,
): Promise<void> {
    const data = await import("@/services/auth.service").then(s => s.registerUser(req.body));
    res.success(data, httpCodes.created);
}

/** POST /auth/verify-email */
export async function postAuthVerifyEmail(
    req: Request<unknown, unknown, import("@/validators/auth.validator").VerifyEmailBodyDto>,
    res: Response,
): Promise<void> {
    await import("@/services/auth.service").then(s => s.verifyEmailToken(req.body.token));
    res.success({ message: "Email verified successfully" }, httpCodes.ok);
}

/** GET /auth/me */
export async function getAuthMe(req: Request, res: Response): Promise<void> {
    const data = await import("@/services/auth.service").then(s => s.getCurrentUser(req.auth!.user.id));
    res.success(data, httpCodes.ok);
}

/** POST /auth/change-password */
export async function postAuthChangePassword(
    req: Request<unknown, unknown, import("@/validators/auth.validator").ChangePasswordBodyDto>,
    res: Response,
): Promise<void> {
    await import("@/services/auth.service").then(s => s.changePassword(req.auth!.user.id, req.body));
    res.success({ message: "Password changed successfully" }, httpCodes.ok);
}

/** POST /auth/verify-old-password */
export async function postAuthVerifyOldPassword(
    req: Request<unknown, unknown, import("@/validators/auth.validator").VerifyOldPasswordBodyDto>,
    res: Response,
): Promise<void> {
    const isValid = await import("@/services/auth.service").then(s => s.verifyOldPassword(req.auth!.user.id, req.body.oldPassword));
    res.success({ isValid }, httpCodes.ok);
}

/** POST /auth/forgot-password */
export async function postAuthForgotPassword(
    req: Request<unknown, unknown, import("@/validators/auth.validator").ForgotPasswordBodyDto>,
    res: Response,
): Promise<void> {
    await import("@/services/auth.service").then(s => s.forgotPassword(req.body.email));
    res.success({ message: "Password reset email sent if account exists" }, httpCodes.ok);
}

/** POST /auth/reset-password */
export async function postAuthResetPassword(
    req: Request<unknown, unknown, import("@/validators/auth.validator").ResetPasswordBodyDto>,
    res: Response,
): Promise<void> {
    await import("@/services/auth.service").then(s => s.resetPassword(req.body.token, req.body.newPassword));
    res.success({ message: "Password has been reset successfully" }, httpCodes.ok);
}

/** PUT /auth/me */
export async function putAuthMe(
    req: Request<unknown, unknown, import("@/validators/auth.validator").UpdateMeBodyDto>,
    res: Response,
): Promise<void> {
    const user = await import("@/services/auth.service").then(s => s.updateMe(req.auth!.user.id, req.body));

    // Bắn event realtime để UI cập nhật author của tất cả Reels trong Highlights section
    try {
        getPusher().trigger("reels-channel", "author-updated", {
            name: user.fullName,
            avatar: user.avatarUrl ?? null,
        });
    } catch (err) {
        console.error("Pusher không gửi được event author-updated:", err);
    }

    res.success({ user }, httpCodes.ok);
}
