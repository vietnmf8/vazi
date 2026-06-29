import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as exemptionCountriesController from "@/controllers/exemption-countries.controller";

const router = Router();

router.get("/", asyncHandler(exemptionCountriesController.getExemptionCountries));

export default router;
