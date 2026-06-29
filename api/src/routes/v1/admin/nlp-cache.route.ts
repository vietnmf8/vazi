import { Router } from "express";

import * as nlpCacheController from "@/controllers/admin/nlp-cache.controller";
import { requireAllowedAdmin, requireRole, verifyToken } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());
router.get("/stats", asyncHandler(nlpCacheController.getNlpCacheStats));
router.post("/retrain", asyncHandler(nlpCacheController.triggerRetrain));

export default router;
