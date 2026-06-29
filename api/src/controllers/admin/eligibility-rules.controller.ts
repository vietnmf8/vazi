import type { Request, Response } from "express";

import {
    createAdminEligibilityRule,
    deleteAdminEligibilityRule,
    getAdminEligibilityRuleById,
    listAdminEligibilityRules,
    updateAdminEligibilityRule,
} from "@/services/admin/eligibility-rules.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreateEligibilityRuleDto,
    AdminEligibilityRuleIdParamsDto,
    AdminEligibilityRulesQueryDto,
    AdminUpdateEligibilityRuleDto,
} from "@/validators/admin/eligibility-rules.validator";

export async function getEligibilityRulesList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminEligibilityRulesQueryDto;
    const { rows, total } = await listAdminEligibilityRules(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getEligibilityRuleDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminEligibilityRuleIdParamsDto;
    res.success(await getAdminEligibilityRuleById(id));
}

export async function postEligibilityRule(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateEligibilityRuleDto;
    res.success(await createAdminEligibilityRule(body), 201);
}

export async function putEligibilityRule(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminEligibilityRuleIdParamsDto;
    const body = req.body as AdminUpdateEligibilityRuleDto;
    res.success(await updateAdminEligibilityRule(id, body));
}

export async function deleteEligibilityRule(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminEligibilityRuleIdParamsDto;
    await deleteAdminEligibilityRule(id);
    res.success({ deleted: true });
}
