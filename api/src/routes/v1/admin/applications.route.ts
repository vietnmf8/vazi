import { Router } from "express";

import * as applicationsController from "@/controllers/admin/applications.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminApplicationIdParamsSchema,
    adminApplicationsQuerySchema,
    adminUpdateApplicationSchema,
    adminUpdateApplicationStatusSchema,
    adminUpdateResultDocumentSchema,
    adminUpdatePickupImageSchema,
} from "@/validators/admin/applications.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminApplicationsQuerySchema, "query"),
    asyncHandler(applicationsController.getApplicationsList),
);

router.get(
    "/:id/audit-logs",
    validate(adminApplicationIdParamsSchema, "params"),
    asyncHandler(applicationsController.getApplicationAuditLogs),
);

router.get(
    "/:id",
    validate(adminApplicationIdParamsSchema, "params"),
    asyncHandler(applicationsController.getApplicationDetail),
);

router.patch(
    "/:id/status",
    validate(adminApplicationIdParamsSchema, "params"),
    validate(adminUpdateApplicationStatusSchema),
    asyncHandler(applicationsController.patchApplicationStatus),
);

router.patch(
    "/:id/result-document",
    validate(adminApplicationIdParamsSchema, "params"),
    validate(adminUpdateResultDocumentSchema),
    asyncHandler(applicationsController.patchResultDocument),
);

router.patch(
    "/:id/pickup-image",
    validate(adminApplicationIdParamsSchema, "params"),
    validate(adminUpdatePickupImageSchema),
    asyncHandler(applicationsController.patchPickupImage),
);

router.patch(
    "/:id",
    validate(adminApplicationIdParamsSchema, "params"),
    validate(adminUpdateApplicationSchema),
    asyncHandler(applicationsController.patchApplication),
);

export default router;
