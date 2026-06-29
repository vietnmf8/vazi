import { Router } from "express";
import { createReel, updateReel, deleteReel } from "@/controllers/admin/reels.controller";
import { asyncHandler } from "@/utils/asyncHandler";
import { verifyToken, requireRole } from "@/middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"));

router.post("/", asyncHandler(createReel));
router.patch("/:id", asyncHandler(updateReel));
router.delete("/:id", asyncHandler(deleteReel));

export default router;
