import { useState, useRef } from "react";
import toast from "react-hot-toast";
import type { UseFormSetValue } from "react-hook-form";
import { extractPassportFormData } from "@/lib/api/passport.api";
import type { Nationality, PassportFieldConfidence } from "@/types/api";
import type { Step2FormValues } from "../applySchemas";

export type FieldConfidenceMap = Partial<
    Record<
        "full_name" | "gender" | "nationality" | "date_of_birth" | "passport_number" | "passport_expiry_date",
        PassportFieldConfidence
    >
>;

interface UsePassportOCRProps {
    index: number;
    setValue: UseFormSetValue<Step2FormValues>;
    nationalities?: Nationality[];
}

export function usePassportOCR({ index, setValue, nationalities }: UsePassportOCRProps) {
    const [isExtracting, setIsExtracting] = useState(false);
    const [fieldConfidence, setFieldConfidence] = useState<FieldConfidenceMap>({});
    const extractionRef = useRef(0);

    const handlePassportUpload = async (url: string | null, file?: File, isBackgroundSuccess?: boolean) => {
        if (!url) {
            extractionRef.current++;
            setIsExtracting(false);
            setFieldConfidence({});
            setValue(`applicants.${index}.full_name`, "");
            setValue(`applicants.${index}.gender`, "male");
            setValue(`applicants.${index}.date_of_birth`, "");
            setValue(`applicants.${index}.passport_number`, "");
            setValue(`applicants.${index}.passport_expiry_date`, "");
            setValue(`applicants.${index}.nationality`, "");
            return;
        }

        if (isBackgroundSuccess) return;

        const generation = ++extractionRef.current;
        setIsExtracting(true);
        setFieldConfidence({});
        try {
            let blob: Blob;
            if (file) {
                blob = file;
            } else if (!url.startsWith("local-draft:")) {
                const response = await fetch(url);
                blob = await response.blob();
            } else {
                throw new Error("Cannot fetch local draft URL directly without File object");
            }

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("TIMEOUT")), 60000)
            );

            const result = await Promise.race([extractPassportFormData(blob), timeoutPromise]);

            if (generation !== extractionRef.current) return;
            const { fields, confidence } = result;
            const updatedConfidence = { ...confidence };

            if (fields.full_name) setValue(`applicants.${index}.full_name`, fields.full_name);
            if (fields.gender) setValue(`applicants.${index}.gender`, fields.gender);
            if (fields.date_of_birth) setValue(`applicants.${index}.date_of_birth`, fields.date_of_birth);
            if (fields.passport_number) setValue(`applicants.${index}.passport_number`, fields.passport_number);
            if (fields.passport_expiry_date) setValue(`applicants.${index}.passport_expiry_date`, fields.passport_expiry_date);

            if (fields.nationality_name && nationalities && nationalities.length > 0) {
                const match = nationalities.find((n) => n.name.toLowerCase() === fields.nationality_name!.toLowerCase());
                if (match) {
                    setValue(`applicants.${index}.nationality`, match.code);
                } else {
                    updatedConfidence.nationality = "low";
                }
            }

            setFieldConfidence(updatedConfidence);

            const hasLowConfidence = Object.values(updatedConfidence).some((c) => c === "low");
            if (hasLowConfidence) {
                toast("Please review the highlighted fields", { icon: "⚠️", duration: 5000 });
            } else {
                toast.success("AI filled your passport details automatically!", { duration: 3000 });
            }
        } catch (err: unknown) {
            if (generation !== extractionRef.current) return;
            const message = err instanceof Error ? err.message : "";
            if (message === "TIMEOUT") {
                toast.error("Passport reading took too long. Please verify and fill manually.");
            } else {
                toast.error("Could not read passport. Please fill the fields manually.");
            }
        } finally {
            if (generation === extractionRef.current) {
                setIsExtracting(false);
            }
        }
    };

    return {
        isExtracting,
        fieldConfidence,
        handlePassportUpload,
    };
}
