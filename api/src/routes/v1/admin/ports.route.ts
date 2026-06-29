import { Router } from "express";

import * as portsController from "@/controllers/admin/ports.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreatePortSchema,
    adminPortIdParamsSchema,
    adminPortsQuerySchema,
    adminUpdatePortSchema,
} from "@/validators/admin/ports.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get("/", validate(adminPortsQuerySchema, "query"), asyncHandler(portsController.getPortsList));
router.get("/:id", validate(adminPortIdParamsSchema, "params"), asyncHandler(portsController.getPortDetail));
router.post("/", validate(adminCreatePortSchema), asyncHandler(portsController.postPort));
router.put(
    "/:id",
    validate(adminPortIdParamsSchema, "params"),
    validate(adminUpdatePortSchema),
    asyncHandler(portsController.putPort),
);
router.delete(
    "/:id",
    validate(adminPortIdParamsSchema, "params"),
    asyncHandler(portsController.deletePort),
);

export default router;
