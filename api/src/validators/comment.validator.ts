import { z } from "zod";

export const createCommentBodySchema = z
    .object({
        content: z.string().trim().max(1000, { message: "validation.comment.content.max" }).optional(),
        images: z.array(z.string().url()).max(5, { message: "validation.comment.images.max" }).optional(),
        authorName: z.string().trim().min(1, { message: "validation.comment.author_name.required" }).max(100, { message: "validation.comment.author_name.max" }),
        authorEmail: z.string().trim().email({ message: "validation.comment.email.invalid" }),
        authorNationality: z.string().trim().length(2).optional(),
        parentId: z.string().uuid().optional(),
    })
    .strict()
    .refine((data) => data.content || (data.images && data.images.length > 0), {
        message: "validation.comment.content_or_images_required",
        path: ["content"],
    });

export const deleteCommentParamsSchema = z.object({
    id: z.string().uuid({ message: "validation.comment.id.invalid" }),
});

export const deleteCommentBodySchema = z.object({
    authorToken: z.string().min(1, { message: "validation.comment.author_token.required" }),
});

export const helpfulCommentParamsSchema = z.object({
    id: z.string().uuid({ message: "validation.comment.id.invalid" }),
});

export type CreateCommentBodyDto = z.infer<typeof createCommentBodySchema>;
export type DeleteCommentBodyDto = z.infer<typeof deleteCommentBodySchema>;

export const editCommentBodySchema = z
    .object({
        authorToken: z.string().min(1, { message: "validation.comment.author_token.required" }),
        content: z.string().trim().max(1000, { message: "validation.comment.content.max" }).optional(),
        images: z.array(z.string().url()).max(5, { message: "validation.comment.images.max" }).optional(),
    })
    .strict()
    .refine((data) => data.content || (data.images && data.images.length > 0), {
        message: "validation.comment.content_or_images_required",
        path: ["content"],
    });

export type EditCommentBodyDto = z.infer<typeof editCommentBodySchema>;
