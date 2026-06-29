export type VisaCategory = "evisa-code" | "evisa" | "voa";
export type VisaOption =
    | "code-fasttrack"
    | "basic-fasttrack"
    | "evisa-30-single"
    | "evisa-90-single"
    | "evisa-90-multiple"
    | "voa-1m-single"
    | "voa-1m-multiple"
    | "voa-3m-single"
    | "voa-3m-multiple";

export type ProcessingSpeed = "normal" | "urgent-4d" | "urgent-2d" | "urgent-1d";

export type VisaItem = {
    id: VisaOption;
    category: VisaCategory;
    label: string;
    price: number;
};

export const VISA_OPTIONS: VisaItem[] = [
    {
        id: "basic-fasttrack",
        category: "evisa-code",
        label: "basic_fasttrack",
        price: 35,
    },
    {
        id: "code-fasttrack",
        category: "evisa-code",
        label: "code_fasttrack",
        price: 55,
    },
    {
        id: "evisa-30-single",
        category: "evisa",
        label: "evisa_30_single",
        price: 55,
    },
    {
        id: "evisa-90-single",
        category: "evisa",
        label: "evisa_90_single",
        price: 75,
    },
    {
        id: "evisa-90-multiple",
        category: "evisa",
        label: "evisa_90_multiple",
        price: 85,
    },
    {
        id: "voa-1m-single",
        category: "voa",
        label: "voa_1m_single",
        price: 25,
    },
    {
        id: "voa-1m-multiple",
        category: "voa",
        label: "voa_1m_multiple",
        price: 35,
    },
    {
        id: "voa-3m-single",
        category: "voa",
        label: "voa_3m_single",
        price: 45,
    },
    {
        id: "voa-3m-multiple",
        category: "voa",
        label: "voa_3m_multiple",
        price: 55,
    },
];

export const PROCESSING_OPTIONS: {
    id: ProcessingSpeed;
    label: string;
    surcharge: number;
}[] = [
    { id: "normal", label: "normal_7_days", surcharge: 0 },
    { id: "urgent-4d", label: "urgent_4_days", surcharge: 35 },
    { id: "urgent-2d", label: "urgent_2_hours", surcharge: 65 },
    { id: "urgent-1d", label: "urgent_1_day", surcharge: 95 },
];

export const PORTS = [
    { value: "HAN", label: "han" },
    { value: "SGN", label: "sgn" },
    { value: "DAD", label: "dad" },
    { value: "PQC", label: "pqc" },
    { value: "MOC_BAI", label: "moc_bai" },
];

export const triggerCls =
    "w-full rounded-xl border border-(--color-border-strong) bg-(--color-surface-1) px-4 text-sm font-semibold text-(--color-text-primary) h-10 transition-all flex items-center justify-between shadow-2xs hover:border-(--color-primary)/50 focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 focus:border-(--color-primary) focus:ring-offset-0 focus:hover:border-(--color-primary) data-[state=open]:ring-2 data-[state=open]:ring-(--color-primary)/20 data-[state=open]:border-(--color-primary) data-[state=open]:hover:border-(--color-primary)";
