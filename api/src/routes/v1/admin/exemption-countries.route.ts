import { Router } from "express";

import * as exemptionCountriesController from "@/controllers/admin/exemption-countries.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreateExemptionCountrySchema,
    adminExemptionCountriesQuerySchema,
    adminExemptionCountryIdParamsSchema,
    adminUpdateExemptionCountrySchema,
} from "@/validators/admin/exemption-countries.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminExemptionCountriesQuerySchema, "query"),
    asyncHandler(exemptionCountriesController.getExemptionCountriesList),
);
router.get(
    "/:id",
    validate(adminExemptionCountryIdParamsSchema, "params"),
    asyncHandler(exemptionCountriesController.getExemptionCountryDetail),
);
router.post(
    "/",
    validate(adminCreateExemptionCountrySchema),
    asyncHandler(exemptionCountriesController.postExemptionCountry),
);
router.put(
    "/:id",
    validate(adminExemptionCountryIdParamsSchema, "params"),
    validate(adminUpdateExemptionCountrySchema),
    asyncHandler(exemptionCountriesController.putExemptionCountry),
);
router.delete(
    "/:id",
    validate(adminExemptionCountryIdParamsSchema, "params"),
    asyncHandler(exemptionCountriesController.deleteExemptionCountry),
);

export default router;
