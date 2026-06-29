import { Router } from "express";

import * as pricingRulesController from "@/controllers/admin/pricing-rules.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreatePricingRuleSchema,
    adminPricingRuleIdParamsSchema,
    adminPricingRulesQuerySchema,
    adminUpdatePricingRuleSchema,
} from "@/validators/admin/pricing-rules.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminPricingRulesQuerySchema, "query"),
    asyncHandler(pricingRulesController.getPricingRulesList),
);
router.get(
    "/:id",
    validate(adminPricingRuleIdParamsSchema, "params"),
    asyncHandler(pricingRulesController.getPricingRuleDetail),
);
router.post("/", validate(adminCreatePricingRuleSchema), asyncHandler(pricingRulesController.postPricingRule));
router.put(
    "/:id",
    validate(adminPricingRuleIdParamsSchema, "params"),
    validate(adminUpdatePricingRuleSchema),
    asyncHandler(pricingRulesController.putPricingRule),
);
router.delete(
    "/:id",
    validate(adminPricingRuleIdParamsSchema, "params"),
    asyncHandler(pricingRulesController.deletePricingRule),
);

export default router;
