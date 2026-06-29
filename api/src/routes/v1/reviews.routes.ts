import { Router } from "express";
import * as reviewsController from "@/controllers/reviews.controller";
import { asyncHandler } from "@/utils/asyncHandler";
import validate from "@/middlewares/validate";
import { createReviewSchema } from "@/validators/reviews.validator";

const router = Router();

router.get("/", asyncHandler(reviewsController.listReviews));
router.post("/", validate(createReviewSchema), asyncHandler(reviewsController.createReview));

export default router;
