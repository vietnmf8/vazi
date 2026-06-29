import { Router } from "express";
import * as faqsController from "@/controllers/faqs.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(faqsController.listFaqs));

export default router;
