import { Router } from "express";
import * as nationalitiesController from "@/controllers/nationalities.controller";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(nationalitiesController.listNationalities));

export default router;
