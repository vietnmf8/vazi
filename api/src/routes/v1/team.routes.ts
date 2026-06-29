import { Router } from "express";
import * as teamController from "@/controllers/team.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(teamController.listTeamMembers));

export default router;
