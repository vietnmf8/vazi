import { Router } from "express";

import * as teamMembersController from "@/controllers/admin/team-members.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreateTeamMemberSchema,
    adminTeamMemberIdParamsSchema,
    adminTeamMembersQuerySchema,
    adminUpdateTeamMemberSchema,
} from "@/validators/admin/team-members.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminTeamMembersQuerySchema, "query"),
    asyncHandler(teamMembersController.getTeamMembersList),
);

router.get(
    "/:id",
    validate(adminTeamMemberIdParamsSchema, "params"),
    asyncHandler(teamMembersController.getTeamMemberDetail),
);

router.post(
    "/",
    validate(adminCreateTeamMemberSchema),
    asyncHandler(teamMembersController.postTeamMember),
);

router.put(
    "/:id",
    validate(adminTeamMemberIdParamsSchema, "params"),
    validate(adminUpdateTeamMemberSchema),
    asyncHandler(teamMembersController.putTeamMember),
);

router.delete(
    "/:id",
    validate(adminTeamMemberIdParamsSchema, "params"),
    asyncHandler(teamMembersController.deleteTeamMember),
);

export default router;
