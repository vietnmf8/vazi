import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

import { httpCodes } from "@/configs/constants";
import { getEnv } from "@/configs/env.config";
import prisma from "@/lib/prisma";
import { getPusher } from "@/lib/pusher-client";
import { AppError } from "@/utils/errors";
import type { LoginBodyDto } from "@/validators/auth.validator";

export async function loginUser(input: LoginBodyDto): Promise<{
    token: string;
    user: { id: string; email: string; role: string };
}> {
    const user = await prisma.user.findUnique({
        where: { email: input.email.trim().toLowerCase() },
        select: { id: true, email: true, passwordHash: true, role: true, fullName: true, accountStatus: true, emailVerifiedAt: true },
    });

    const isValid =
        user?.passwordHash &&
        (await bcrypt.compare(input.password, user.passwordHash));

    const env = getEnv();

    if (!user || !isValid) {
        throw new AppError("auth.invalid_credentials", httpCodes.unauthorized, "INVALID_CREDENTIALS");
    }

    if (user.accountStatus === "PENDING") {
        throw new AppError("auth.account_pending", httpCodes.forbidden, "ACCOUNT_PENDING");
    }

    if (user.accountStatus === "REJECTED") {
        throw new AppError("auth.account_rejected", httpCodes.forbidden, "ACCOUNT_REJECTED");
    }

    if (!user.emailVerifiedAt) {
        throw new AppError("auth.email_not_verified", httpCodes.forbidden, "EMAIL_NOT_VERIFIED");
    }

    if (!env.JWT_SECRET) {
        throw new AppError("auth.jwt_not_configured", httpCodes.serviceUnavailable, "SERVICE_UNAVAILABLE");
    }

    const tokenTtl = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
    const signOptions: SignOptions = { expiresIn: tokenTtl };
    const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        signOptions,
    );

    return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export async function registerUser(input: import("@/validators/auth.validator").RegisterBodyDto): Promise<{
    user: { id: string; email: string };
}> {
    const existing = await prisma.user.findUnique({
        where: { email: input.email.trim().toLowerCase() },
    });

    if (existing) {
        throw new AppError("auth.email_exists", httpCodes.conflict, "EMAIL_EXISTS");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const newUser = await prisma.user.create({
        data: {
            email: input.email.trim().toLowerCase(),
            passwordHash,
            fullName: input.fullName,
            phone: input.phone,
            role: "ADMIN",
            accountStatus: "PENDING",
        },
    });

    // Trigger realtime update to Admin UI
    getPusher()?.trigger("admin-notifications", "users_updated", {
        timestamp: Date.now(),
        action: "register",
    }).catch(console.error);

    return { user: { id: newUser.id, email: newUser.email } };
}

export async function verifyEmailToken(token: string): Promise<void> {
    const env = getEnv();
    if (!env.JWT_SECRET) {
        throw new AppError("auth.jwt_not_configured", httpCodes.serviceUnavailable, "SERVICE_UNAVAILABLE");
    }

    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
        const userId = payload.sub;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");
        if (user.emailVerifiedAt) throw new Error("Email already verified");

        await prisma.user.update({
            where: { id: userId },
            data: { emailVerifiedAt: new Date() },
        });
    } catch (error) {
        throw new AppError("auth.invalid_verification_token", httpCodes.badRequest, "INVALID_TOKEN");
    }
}

export async function getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, fullName: true, role: true, accountStatus: true, phone: true, avatarUrl: true },
    });
    if (!user) {
        throw new AppError("auth.user_not_found", httpCodes.unauthorized, "UNAUTHORIZED");
    }
    return user;
}

export async function changePassword(userId: string, input: import("@/validators/auth.validator").ChangePasswordBodyDto): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });
    
    if (!user || !user.passwordHash) {
        throw new AppError("auth.user_not_found", httpCodes.notFound, "USER_NOT_FOUND");
    }
    
    const isValid = await bcrypt.compare(input.oldPassword, user.passwordHash);
    if (!isValid) {
        throw new AppError("auth.invalid_old_password", httpCodes.badRequest, "INVALID_OLD_PASSWORD");
    }
    
    const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
    
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
    });
}

export async function verifyOldPassword(userId: string, oldPassword: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });
    
    if (!user || !user.passwordHash) {
        throw new AppError("auth.user_not_found", httpCodes.notFound, "USER_NOT_FOUND");
    }
    
    return await bcrypt.compare(oldPassword, user.passwordHash);
}

export async function forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // We do not throw error here to prevent email enumeration, just return
        return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetPasswordToken: token,
            resetPasswordExpires: expires,
        },
    });

    // Queue email job
    await prisma.backgroundJob.create({
        data: {
            type: "SEND_RESET_PASSWORD_EMAIL",
            payload: {
                email: user.email,
                name: user.fullName,
                token: token,
            },
        },
    });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
        where: {
            resetPasswordToken: token,
            resetPasswordExpires: { gt: new Date() },
        },
    });

    if (!user) {
        throw new AppError("auth.invalid_or_expired_token", httpCodes.badRequest, "INVALID_TOKEN");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: newPasswordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        },
    });
}

export async function updateMe(userId: string, data: { fullName?: string; phone?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            role: true,
            accountStatus: true,
            emailVerifiedAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return user;
}
