import { Router } from "express";

import * as reviewsController from "@/controllers/admin/reviews.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreateReviewSchema,
    adminReviewIdParamsSchema,
    adminReviewsQuerySchema,
    adminUpdateReviewSchema,
} from "@/validators/admin/reviews.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminReviewsQuerySchema, "query"),
    asyncHandler(reviewsController.getReviewsList),
);

router.get(
    "/:id",
    validate(adminReviewIdParamsSchema, "params"),
    asyncHandler(reviewsController.getReviewDetail),
);

router.post("/", validate(adminCreateReviewSchema), asyncHandler(reviewsController.postReview));

router.put(
    "/:id",
    validate(adminReviewIdParamsSchema, "params"),
    validate(adminUpdateReviewSchema),
    asyncHandler(reviewsController.putReview),
);

router.delete(
    "/:id",
    validate(adminReviewIdParamsSchema, "params"),
    asyncHandler(reviewsController.deleteReview),
);

export default router;
