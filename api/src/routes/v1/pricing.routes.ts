import { Router } from "express";
import * as pricingController from "@/controllers/pricing.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(pricingController.getPricingCatalog));
router.get("/calculator-config", asyncHandler(pricingController.getCalculatorConfig));

export default router;
