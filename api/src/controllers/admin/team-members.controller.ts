import type { Request, Response } from "express";

import {
    createAdminTeamMember,
    deleteAdminTeamMember,
    getAdminTeamMemberById,
    listAdminTeamMembers,
    updateAdminTeamMember,
} from "@/services/admin/team-members.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreateTeamMemberDto,
    AdminTeamMemberIdParamsDto,
    AdminTeamMembersQueryDto,
    AdminUpdateTeamMemberDto,
} from "@/validators/admin/team-members.validator";

export async function getTeamMembersList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminTeamMembersQueryDto;
    const { rows, total } = await listAdminTeamMembers(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getTeamMemberDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminTeamMemberIdParamsDto;
    const data = await getAdminTeamMemberById(id);
    res.success(data);
}

export async function postTeamMember(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateTeamMemberDto;
    const data = await createAdminTeamMember(body);
    res.success(data, 201);
}

export async function putTeamMember(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminTeamMemberIdParamsDto;
    const body = req.body as AdminUpdateTeamMemberDto;
    const data = await updateAdminTeamMember(id, body);
    res.success(data);
}

export async function deleteTeamMember(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminTeamMemberIdParamsDto;
    await deleteAdminTeamMember(id);
    res.success({ deleted: true });
}
