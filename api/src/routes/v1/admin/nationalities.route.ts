import { Router } from "express";

import * as nationalitiesController from "@/controllers/admin/nationalities.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreateNationalitySchema,
    adminNationalitiesQuerySchema,
    adminNationalityIdParamsSchema,
    adminUpdateNationalitySchema,
} from "@/validators/admin/nationalities.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminNationalitiesQuerySchema, "query"),
    asyncHandler(nationalitiesController.getNationalitiesList),
);

router.get(
    "/:id",
    validate(adminNationalityIdParamsSchema, "params"),
    asyncHandler(nationalitiesController.getNationalityDetail),
);

router.post(
    "/",
    validate(adminCreateNationalitySchema),
    asyncHandler(nationalitiesController.postNationality),
);

router.put(
    "/:id",
    validate(adminNationalityIdParamsSchema, "params"),
    validate(adminUpdateNationalitySchema),
    asyncHandler(nationalitiesController.putNationality),
);

router.delete(
    "/:id",
    validate(adminNationalityIdParamsSchema, "params"),
    asyncHandler(nationalitiesController.deleteNationality),
);

export default router;
