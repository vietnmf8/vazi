import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { startOfDay } from "date-fns";
import { Step1Form, type Step1FormValues, type visaCategoryValues } from "../applySchemas";
import { EVISA_CATEGORIES, VOA_CATEGORIES, PricingConfigData, formatUsd } from "../priceCalculator";

const DEFAULT_STEP1: Step1FormValues = {
    visa_type: "evisa",
    visa_category: "evisa_30d_single",
    processing_time: "normal_7d",
    applicant_count: 1,
    arrival_date: "",
    port_of_entry: "",
    purpose_of_visit: "",
    vip_fast_track: false,
    basic_fast_track: false,
};

const DEFAULT_FIELDS = new Set<keyof Step1FormValues>([
    "visa_type",
    "visa_category",
    "applicant_count",
    "processing_time",
]);

interface UseStep1LogicProps {
    defaultValues?: Partial<Step1FormValues>;
    onChange?: (data: Step1FormValues) => void;
    pricingConfig?: PricingConfigData | null;
}

export function useStep1Logic({ defaultValues, onChange, pricingConfig }: UseStep1LogicProps) {
    "use no memo";
    const [openDropdown, setOpenDropdown] = useState<
        "visa_type" | "visa_category" | "applicant_count" | "arrival_date" | "port_of_entry" | "purpose_of_visit" | null
    >(null);

    const today = useMemo(() => startOfDay(new Date()), []);

    // Nếu draft arrival_date là ngày trong quá khứ → clear để DatePicker hiển thị placeholder
    const safeArrivalDate =
        defaultValues?.arrival_date && new Date(defaultValues.arrival_date) >= today
            ? defaultValues.arrival_date
            : "";

    const formValues = { ...DEFAULT_STEP1, ...defaultValues, arrival_date: safeArrivalDate };

    const form = useForm<Step1FormValues>({
        resolver: zodResolver(Step1Form),
        defaultValues: formValues,
        values: defaultValues ? formValues : undefined,
        mode: "onChange",
    });

    const { setValue, getValues, formState: { errors, dirtyFields, touchedFields, isSubmitted } } = form;

    const visaType = useWatch({ control: form.control, name: "visa_type" });

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 300);
        return () => clearTimeout(t);
    }, []);

    const onChangeRef = useRef(onChange);
    useLayoutEffect(() => {
        onChangeRef.current = onChange;
    });

    const watchedValues = useWatch({ control: form.control });
    useEffect(() => {
        onChangeRef.current?.(watchedValues as Step1FormValues);
    }, [watchedValues]);

    const evisaCategories = useMemo(() => {
        if (!pricingConfig) return EVISA_CATEGORIES;
        return EVISA_CATEGORIES.map(c => ({
            ...c,
            price: pricingConfig.BASE_FEES[c.value] !== undefined ? formatUsd(pricingConfig.BASE_FEES[c.value]) : c.price
        }));
    }, [pricingConfig]);

    const voaCategories = useMemo(() => {
        if (!pricingConfig) return VOA_CATEGORIES;
        return VOA_CATEGORIES.map(c => ({
            ...c,
            price: pricingConfig.BASE_FEES[c.value] !== undefined ? formatUsd(pricingConfig.BASE_FEES[c.value]) : c.price
        }));
    }, [pricingConfig]);

    useEffect(() => {
        const categories = visaType === "evisa" ? evisaCategories : voaCategories;
        const current = getValues("visa_category");
        const valid = categories.some((c) => c.value === current);
        if (!valid) {
            setValue("visa_category", categories[0].value as (typeof visaCategoryValues)[number], { shouldValidate: true, shouldDirty: true });
        }
    }, [visaType, setValue, getValues, evisaCategories, voaCategories]);

    const categoryOptions = visaType === "evisa" ? evisaCategories : voaCategories;

    function getSuccessMessage(fieldName: keyof Step1FormValues, message: string): string | undefined {
        const value = getValues(fieldName);
        if (!value && value !== 0) return undefined;
        if (errors[fieldName]) return undefined;
        const isDefault = DEFAULT_FIELDS.has(fieldName);
        const isDirty = !!dirtyFields[fieldName as keyof typeof dirtyFields];
        if (!mounted && isDefault && !isDirty) return undefined;
        if (!isDefault && !isDirty) return undefined;
        return message;
    }

    function getFieldError(fieldName: keyof Step1FormValues): string | undefined {
        const isTouched = !!touchedFields[fieldName as keyof typeof touchedFields];
        const isDirty = !!dirtyFields[fieldName as keyof typeof dirtyFields];
        if (!isTouched && !isDirty && !isSubmitted) return undefined;
        return errors[fieldName]?.message;
    }

    return {
        form,
        today,
        openDropdown,
        setOpenDropdown,
        categoryOptions,
        getSuccessMessage,
        getFieldError,
    };
}
