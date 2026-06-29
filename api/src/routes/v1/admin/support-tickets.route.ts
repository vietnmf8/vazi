import { Router } from "express";

import * as supportTicketsController from "@/controllers/admin/support-tickets.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminSupportTicketIdParamsSchema,
    adminSupportTicketsQuerySchema,
    adminUpdateSupportTicketSchema,
} from "@/validators/admin/support-tickets.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminSupportTicketsQuerySchema, "query"),
    asyncHandler(supportTicketsController.getSupportTicketsList),
);

router.get(
    "/:id",
    validate(adminSupportTicketIdParamsSchema, "params"),
    asyncHandler(supportTicketsController.getSupportTicketDetail),
);

router.patch(
    "/:id",
    validate(adminSupportTicketIdParamsSchema, "params"),
    validate(adminUpdateSupportTicketSchema),
    asyncHandler(supportTicketsController.patchSupportTicket),
);

export default router;
