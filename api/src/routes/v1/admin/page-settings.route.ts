import { Router } from "express";

import * as pageSettingsController from "@/controllers/admin/page-settings.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    settingKeyParamsSchema,
    updateSettingValueSchema,
} from "@/validators/admin/settings.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get("/", asyncHandler(pageSettingsController.getPageSettingsList));

router.get(
    "/:key",
    validate(settingKeyParamsSchema, "params"),
    asyncHandler(pageSettingsController.getPageSettingDetail),
);

router.put(
    "/:key",
    validate(settingKeyParamsSchema, "params"),
    validate(updateSettingValueSchema),
    asyncHandler(pageSettingsController.putPageSetting),
);

export default router;
