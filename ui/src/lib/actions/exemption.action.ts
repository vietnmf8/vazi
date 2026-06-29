"use server";

import { getExemption } from "@/lib/api/pricing.api";
import type { ExemptionResult } from "@/types/api";

export async function fetchExemptionAction(code: string): Promise<ExemptionResult> {
    return getExemption(code);
}
