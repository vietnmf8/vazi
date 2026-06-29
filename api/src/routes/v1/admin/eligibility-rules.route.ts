import { Router } from "express";

import * as eligibilityRulesController from "@/controllers/admin/eligibility-rules.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreateEligibilityRuleSchema,
    adminEligibilityRuleIdParamsSchema,
    adminEligibilityRulesQuerySchema,
    adminUpdateEligibilityRuleSchema,
} from "@/validators/admin/eligibility-rules.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminEligibilityRulesQuerySchema, "query"),
    asyncHandler(eligibilityRulesController.getEligibilityRulesList),
);
router.get(
    "/:id",
    validate(adminEligibilityRuleIdParamsSchema, "params"),
    asyncHandler(eligibilityRulesController.getEligibilityRuleDetail),
);
router.post(
    "/",
    validate(adminCreateEligibilityRuleSchema),
    asyncHandler(eligibilityRulesController.postEligibilityRule),
);
router.put(
    "/:id",
    validate(adminEligibilityRuleIdParamsSchema, "params"),
    validate(adminUpdateEligibilityRuleSchema),
    asyncHandler(eligibilityRulesController.putEligibilityRule),
);
router.delete(
    "/:id",
    validate(adminEligibilityRuleIdParamsSchema, "params"),
    asyncHandler(eligibilityRulesController.deleteEligibilityRule),
);

export default router;
