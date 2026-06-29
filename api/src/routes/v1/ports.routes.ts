import { Router } from "express";
import * as portsController from "@/controllers/ports.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(portsController.listPorts));

export default router;
