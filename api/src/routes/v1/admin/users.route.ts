import { Router } from "express";

import * as usersController from "@/controllers/admin/users.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { adminUsersQuerySchema } from "@/validators/admin/users.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"));

router.get(
    "/",
    validate(adminUsersQuerySchema, "query"),
    asyncHandler(usersController.getUsersList),
);

router.post(
    "/:id/approve",
    asyncHandler(usersController.approveUser),
);

router.post(
    "/:id/reject",
    asyncHandler(usersController.rejectUser),
);

router.delete(
    "/:id",
    asyncHandler(usersController.deleteUser),
);

export default router;
