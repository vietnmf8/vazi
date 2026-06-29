import type { Request, Response } from "express";

import {
    createAdminPricingRule,
    deleteAdminPricingRule,
    getAdminPricingRuleById,
    listAdminPricingRules,
    updateAdminPricingRule,
} from "@/services/admin/pricing-rules.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreatePricingRuleDto,
    AdminPricingRuleIdParamsDto,
    AdminPricingRulesQueryDto,
    AdminUpdatePricingRuleDto,
} from "@/validators/admin/pricing-rules.validator";

export async function getPricingRulesList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminPricingRulesQueryDto;
    const { rows, total } = await listAdminPricingRules(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getPricingRuleDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminPricingRuleIdParamsDto;
    res.success(await getAdminPricingRuleById(id));
}

export async function postPricingRule(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreatePricingRuleDto;
    res.success(await createAdminPricingRule(body), 201);
}

export async function putPricingRule(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminPricingRuleIdParamsDto;
    const body = req.body as AdminUpdatePricingRuleDto;
    res.success(await updateAdminPricingRule(id, body));
}

export async function deletePricingRule(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminPricingRuleIdParamsDto;
    await deleteAdminPricingRule(id);
    res.success({ deleted: true });
}
