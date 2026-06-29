import { Router } from "express";
import * as reelsController from "@/controllers/reels.controller";

const router = Router();

router.get("/", reelsController.getReels);
router.post("/:id/reactions", reelsController.addReaction);

export default router;
