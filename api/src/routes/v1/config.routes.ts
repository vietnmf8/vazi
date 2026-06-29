import { Router } from "express";
import * as configController from "@/controllers/config.controller";

const router = Router();

router.get("/ports", configController.getPorts);
router.get("/eligibility-rules", configController.getEligibilityRules);

export default router;
