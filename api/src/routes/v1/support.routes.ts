import { Router } from "express";

import * as supportController from "@/controllers/support.controller";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { supportContactBodySchema } from "@/validators/support.validator";

const router = Router();

router.post(
    "/contact",
    validate(supportContactBodySchema, "body"),
    asyncHandler(supportController.postSupportContact),
);

export default router;
