import type { Request, Response } from "express";

import {
    getGlobalSettingByKey,
    listGlobalSettings,
    updateGlobalSetting,
} from "@/services/admin/global-settings.admin.service";
import type {
    SettingKeyParamsDto,
    UpdateSettingValueDto,
} from "@/validators/admin/settings.validator";

/** GET /admin/global-settings */
export async function getGlobalSettingsList(req: Request, res: Response): Promise<void> {
    const data = await listGlobalSettings();
    res.success(data);
}

/** GET /admin/global-settings/:key */
export async function getGlobalSettingDetail(req: Request, res: Response): Promise<void> {
    const { key } = req.params as SettingKeyParamsDto;
    const data = await getGlobalSettingByKey(key);
    res.success(data);
}

/** PUT /admin/global-settings/:key */
export async function putGlobalSetting(req: Request, res: Response): Promise<void> {
    const { key } = req.params as SettingKeyParamsDto;
    const { value } = req.body as UpdateSettingValueDto;
    const data = await updateGlobalSetting(key, value);
    res.success(data);
}
