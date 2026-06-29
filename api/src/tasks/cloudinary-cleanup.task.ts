import { v2 as cloudinary } from "cloudinary";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import * as Sentry from "@sentry/node";
import { configureCloudinaryFromEnv } from "@/lib/cloudinary-client";

export async function runCloudinaryCleanupTask() {
    if (!configureCloudinaryFromEnv()) {
        console.warn("[cloudinary-cleanup] Thiếu biến môi trường Cloudinary, bỏ qua task.");
        return;
    }

    // Tìm các comment đã xoá (deletedAt != null) và có ảnh (images != null)
    const comments = await prisma.comment.findMany({
        where: {
            deletedAt: { not: null },
            images: { not: Prisma.DbNull },
        },
    });

    if (!comments.length) {
        return;
    }

    let processed = 0;

    for (const comment of comments) {
        try {
            // Prisma trả Json về kiểu object array trong TS
            let urls: string[] = [];
            if (typeof comment.images === "string") {
                try {
                    urls = JSON.parse(comment.images) as string[];
                } catch {
                    urls = [];
                }
            } else if (Array.isArray(comment.images)) {
                urls = comment.images as string[];
            }

            if (!Array.isArray(urls) || urls.length === 0) {
                // Rác dữ liệu -> set về null luôn để lần sau khỏi quét
                await prisma.comment.update({
                    where: { id: comment.id },
                    data: { images: Prisma.DbNull },
                });
                continue;
            }

            let allDeleted = true;

            for (const url of urls) {
                if (typeof url !== "string") continue;
                // Lấy public_id (VD: https://res.cloudinary.com/.../upload/v1234/folder/file.jpg)
                const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
                if (match && match[1]) {
                    const publicId = match[1];
                    try {
                        await cloudinary.uploader.destroy(publicId);
                        console.info(`[cloudinary-cleanup] Xoá ảnh thành công: ${publicId}`);
                    } catch (err) {
                        console.error(`[cloudinary-cleanup] Lỗi xoá ảnh: ${publicId}`, err);
                        allDeleted = false;
                    }
                }
            }

            if (allDeleted) {
                await prisma.comment.update({
                    where: { id: comment.id },
                    data: { images: Prisma.DbNull },
                });
                processed++;
            }
        } catch (error) {
            Sentry.captureException(error, { tags: { task: "cloudinary-cleanup" }, extra: { commentId: comment.id } });
            console.error(`[cloudinary-cleanup] Lỗi xử lý comment ${comment.id}:`, error);
        }
    }

    if (processed > 0) {
        console.info(`[cloudinary-cleanup] Đã dọn dẹp ảnh cho ${processed} comments bị xoá.`);
    }
}
