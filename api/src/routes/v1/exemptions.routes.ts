import { Router } from "express";

import * as exemptionsController from "@/controllers/exemptions.controller";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { exemptionCountryParamSchema } from "@/validators/exemptions.validator";

const router = Router();

router.get(
    "/:country_code",
    validate(exemptionCountryParamSchema, "params"),
    asyncHandler(exemptionsController.getExemptionByCode),
);

export default router;
