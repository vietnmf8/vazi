import { Router } from "express";

import * as globalSettingsController from "@/controllers/admin/global-settings.controller";
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

router.get("/", asyncHandler(globalSettingsController.getGlobalSettingsList));

router.get(
    "/:key",
    validate(settingKeyParamsSchema, "params"),
    asyncHandler(globalSettingsController.getGlobalSettingDetail),
);

router.put(
    "/:key",
    validate(settingKeyParamsSchema, "params"),
    validate(updateSettingValueSchema),
    asyncHandler(globalSettingsController.putGlobalSetting),
);

export default router;
