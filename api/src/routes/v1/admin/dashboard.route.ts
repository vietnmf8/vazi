import { Router } from "express";

import * as dashboardController from "@/controllers/admin/dashboard.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get("/stats", asyncHandler(dashboardController.getDashboardStats));

export default router;
