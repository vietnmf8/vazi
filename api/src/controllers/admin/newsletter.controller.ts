import type { Request, Response } from "express";

import {
    listAdminNewsletter,
    deleteAdminNewsletter,
    listAdminCampaigns,
    deleteAdminCampaign,
    generateAdminCampaign,
    updateAdminCampaign,
    createAdminCampaignManual,
} from "@/services/admin/newsletter.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminNewsletterIdParamsDto,
    AdminNewsletterQueryDto,
    AdminNewsletterCampaignQueryDto,
    AdminNewsletterCampaignIdParamsDto,
    AdminNewsletterCampaignUpdateDto,
} from "@/validators/admin/newsletter.validator";

export async function getNewsletterList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminNewsletterQueryDto;
    const { rows, total } = await listAdminNewsletter(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function deleteNewsletter(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminNewsletterIdParamsDto;
    await deleteAdminNewsletter(id);
    res.success({ deleted: true });
}

export async function getCampaigns(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminNewsletterCampaignQueryDto;
    const { rows, total } = await listAdminCampaigns(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function deleteCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminNewsletterCampaignIdParamsDto;
    await deleteAdminCampaign(id);
    res.success(true);
}

export async function postGenerateCampaign(req: Request, res: Response): Promise<void> {
    const campaign = await generateAdminCampaign();
    res.success(campaign);
}

export async function patchCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminNewsletterCampaignIdParamsDto;
    const body = req.body as AdminNewsletterCampaignUpdateDto;
    const campaign = await updateAdminCampaign(id, body);
    res.success(campaign);
}

export async function postCreateCampaignManual(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminNewsletterCampaignUpdateDto;
    const campaign = await createAdminCampaignManual(body);
    res.success(campaign);
}
