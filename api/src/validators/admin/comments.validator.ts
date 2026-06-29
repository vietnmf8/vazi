import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

export const adminCommentsQuerySchema = paginationQuerySchema.strict();

export const adminCommentIdParamsSchema = adminResourceIdParamsSchema;

export const adminCommentReplySchema = z.object({
    content: z.string().trim().max(1000, "Nội dung tối đa 1000 ký tự").optional(),
    images: z.array(z.string().url()).max(5, "Tối đa 5 ảnh").optional(),
}).strict().refine((data) => data.content || (data.images && data.images.length > 0), {
    message: "Nội dung hoặc ảnh không được để trống",
    path: ["content"],
});

export const adminCommentEditSchema = adminCommentReplySchema;

export type AdminCommentsQueryDto = z.infer<typeof adminCommentsQuerySchema>;
export type AdminCommentIdParamsDto = z.infer<typeof adminCommentIdParamsSchema>;
export type AdminCommentReplyDto = z.infer<typeof adminCommentReplySchema>;
export type AdminCommentEditDto = z.infer<typeof adminCommentEditSchema>;
