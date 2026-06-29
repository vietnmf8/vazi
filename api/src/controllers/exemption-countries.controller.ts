import { Request, Response } from "express";
import * as exemptionCountriesService from "@/services/exemption-countries.service";

export const getExemptionCountries = async (req: Request, res: Response) => {
    const data = await exemptionCountriesService.getExemptionCountries();
    res.success(data);
};
