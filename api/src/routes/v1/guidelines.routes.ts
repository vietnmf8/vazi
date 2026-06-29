import { Router } from "express";
import * as guidelinesController from "@/controllers/guidelines.controller";

const router = Router();

router.get("/how-to-apply", guidelinesController.getHowToApplyGuideline);

export default router;
