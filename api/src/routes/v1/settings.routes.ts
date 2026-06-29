import { Router } from "express";
import * as settingsController from "@/controllers/settings.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/emergency-inquiry", asyncHandler(settingsController.getEmergencyInquirySettings));
router.get("/about-us", asyncHandler(settingsController.getAboutUsSettings));
router.get("/guide-fees", asyncHandler(settingsController.getGuideFeesSettings));
router.get("/", asyncHandler(settingsController.getSettings));

export default router;
