import { Router } from "express";

import * as stepGuidelinesController from "@/controllers/admin/step-guidelines.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreateStepGuidelineSchema,
    adminStepGuidelineIdParamsSchema,
    adminStepGuidelinesQuerySchema,
    adminUpdateStepGuidelineSchema,
} from "@/validators/admin/step-guidelines.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminStepGuidelinesQuerySchema, "query"),
    asyncHandler(stepGuidelinesController.getStepGuidelinesList),
);

router.get(
    "/:id",
    validate(adminStepGuidelineIdParamsSchema, "params"),
    asyncHandler(stepGuidelinesController.getStepGuidelineDetail),
);

router.post(
    "/",
    validate(adminCreateStepGuidelineSchema),
    asyncHandler(stepGuidelinesController.postStepGuideline),
);

router.put(
    "/:id",
    validate(adminStepGuidelineIdParamsSchema, "params"),
    validate(adminUpdateStepGuidelineSchema),
    asyncHandler(stepGuidelinesController.putStepGuideline),
);

router.delete(
    "/:id",
    validate(adminStepGuidelineIdParamsSchema, "params"),
    asyncHandler(stepGuidelinesController.deleteStepGuideline),
);

export default router;
