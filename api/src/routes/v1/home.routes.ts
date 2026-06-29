import { Router } from "express";
import * as homeController from "@/controllers/home.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/nationalities", asyncHandler(homeController.getNationalities));
router.get("/how-it-works", asyncHandler(homeController.getHowItWorks));
router.get("/pricing-preview", asyncHandler(homeController.getPricingPreview));
router.get("/testimonials", asyncHandler(homeController.getTestimonials));
router.get("/config", asyncHandler(homeController.getHomeConfig));

export default router;
