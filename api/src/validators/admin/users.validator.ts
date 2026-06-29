import { z } from "zod";
import { UserRole, AccountStatus } from "@prisma/client";

import { paginationQuerySchema } from "@/validators/shared/pagination";

const roles = Object.values(UserRole);
const statuses = Object.values(AccountStatus);

export const adminUsersQuerySchema = paginationQuerySchema
    .extend({
        role: z.enum(roles as [UserRole, ...UserRole[]]).optional(),
        accountStatus: z.enum(statuses as [AccountStatus, ...AccountStatus[]]).optional(),
        sort: z.string().optional(),
    });

export type AdminUsersQueryDto = z.infer<typeof adminUsersQuerySchema>;
