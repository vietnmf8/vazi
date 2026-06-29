import type { Request, Response } from "express";

import {
    getPageSettingByKey,
    listPageSettings,
    updatePageSetting,
} from "@/services/admin/page-settings.admin.service";
import type {
    SettingKeyParamsDto,
    UpdateSettingValueDto,
} from "@/validators/admin/settings.validator";

/** GET /admin/page-settings */
export async function getPageSettingsList(req: Request, res: Response): Promise<void> {
    const data = await listPageSettings();
    res.success(data);
}

/** GET /admin/page-settings/:key */
export async function getPageSettingDetail(req: Request, res: Response): Promise<void> {
    const { key } = req.params as SettingKeyParamsDto;
    const data = await getPageSettingByKey(key);
    res.success(data);
}

/** PUT /admin/page-settings/:key */
export async function putPageSetting(req: Request, res: Response): Promise<void> {
    const { key } = req.params as SettingKeyParamsDto;
    const { value } = req.body as UpdateSettingValueDto;
    const data = await updatePageSetting(key, value);
    res.success(data);
}
