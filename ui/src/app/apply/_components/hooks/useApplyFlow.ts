import { useCallback, useEffect, useState } from "react";
import type {
    Step1FormValues,
    Step2FormValues,
    visaCategoryValues,
    processingTimeValues,
} from "../applySchemas";
import { loadApplyDraft, saveApplyDraft, clearApplyDraft, pingApplyHeartbeat } from "../applyDraftStorage";
import { useApplyPrice } from "@/hooks/useApplyPrice";

/** Map URL params từ QuickApplyForm sang Step1FormValues */
function mapQuickApplyParams(
    params: URLSearchParams,
): Partial<Step1FormValues & { basic_fast_track?: boolean }> {
    const result: Partial<Step1FormValues & { basic_fast_track?: boolean }> = {};

    const category = params.get("category");
    if (category === "evisa" || category === "evisa-code") result.visa_type = "evisa";
    else if (category === "voa") result.visa_type = "voa";

    const optionMap: Record<string, (typeof visaCategoryValues)[number]> = {
        "evisa-30-single": "evisa_30d_single",
        "evisa-90-single": "evisa_90d_single",
        "evisa-90-multiple": "evisa_90d_multiple",
        "voa-1m-single": "voa_1m_single",
        "voa-1m-multiple": "voa_1m_multiple",
        "voa-3m-single": "voa_3m_single",
        "voa-3m-multiple": "voa_3m_multiple",
        "code-fasttrack": "code_fasttrack",
        "basic-fasttrack": "code_fasttrack",
        "vip-fasttrack": "code_fasttrack",
    };
    const option = params.get("option");
    if (option && optionMap[option]) {
        result.visa_category = optionMap[option];
        if (option === "basic-fasttrack") {
            result.basic_fast_track = true;
            result.vip_fast_track = false;
        } else if (option === "vip-fasttrack" || option === "code-fasttrack") {
            result.basic_fast_track = false;
            result.vip_fast_track = true;
        }
    }

    const portMap: Record<string, string> = {
        HAN: "HAN",
        SGN: "SGN",
        DAD: "DAD",
        PQC: "PQC",
        MOC_BAI: "MOC_BAI",
    };
    const port = params.get("port");
    if (port) result.port_of_entry = portMap[port.toUpperCase()] ?? port.toUpperCase();

    const count = parseInt(params.get("count") ?? "", 10);
    if (!isNaN(count) && count >= 1 && count <= 5) result.applicant_count = count;

    const speedMap: Record<string, (typeof processingTimeValues)[number]> = {
        normal: "normal_7d",
        "urgent-4d": "urgent_4d",
        "urgent-2d": "urgent_2d",
        "urgent-1d": "urgent_1d",
    };
    const speed = params.get("speed");
    if (speed && speedMap[speed]) result.processing_time = speedMap[speed];

    const arrival = params.get("arrival");
    if (arrival) result.arrival_date = arrival;

    return result;
}

import { useSearchParams } from "next/navigation";

export function useApplyFlow() {
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [step1Data, setStep1Data] = useState<Step1FormValues | null>(null);
    const [step1Live, setStep1Live] = useState<Step1FormValues | null>(null);
    const [step2Data, setStep2Data] = useState<Step2FormValues | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [maxStepReached, setMaxStepReached] = useState(1);
    
    // Dùng ref để đảm bảo chỉ load draft/query 1 lần duy nhất khi mount
    // Hoặc khi searchParams thực sự thay đổi từ bên ngoài (QuickApplyForm)
    const initHash = searchParams ? searchParams.toString() : "";

    const { apiPrice, isPriceLoading, refreshApiPrice } = useApplyPrice();

    useEffect(() => {
        let draft = loadApplyDraft();
        const params = searchParams || new URLSearchParams(window.location.search);
        const hasUrlParams = params.has("option") || params.has("category");

        // TẠI SAO: Khi người dùng tắt trình duyệt và mở lại (phiên làm việc mới),
        // sessionStorage sẽ bị xoá hoàn toàn trong khi localStorage vẫn lưu lại thông tin nháp (draft).
        // Để tránh tình trạng người dùng đột ngột quay trở lại Step 2/3 một cách bất thường,
        // nếu phát hiện đây là một phiên mới (không có cờ trong sessionStorage) và có thông tin nháp cũ,
        // chúng ta sẽ dọn sạch nháp trong localStorage thông qua clearApplyDraft() và tự động điều hướng về trang chủ "/".
        if (typeof window !== "undefined") {
            const isSessionActive = window.sessionStorage.getItem("fastvisa_apply_session_active");
            if (!isSessionActive) {
                if (draft && !hasUrlParams) {
                    clearApplyDraft();
                    window.location.href = "/";
                    return;
                }
                // Thiết lập cờ session để đánh dấu phiên làm việc hiện tại là tích cực
                window.sessionStorage.setItem("fastvisa_apply_session_active", "true");
            }
        }

        // --- Bắt đầu Heartbeat để giữ session sống ---
        pingApplyHeartbeat(); // Ping ngay khi mount
        const intervalId = setInterval(() => {
            pingApplyHeartbeat();
        }, 5000); // 5 giây một lần
        // ---------------------------------------------

        let step1: Step1FormValues | null = null;
        let step2: Step2FormValues | null = null;
        let step = 1;

        const createEmptyApp = () => ({
            full_name: "",
            gender: "male" as const,
            nationality: "",
            date_of_birth: "",
            passport_number: "",
            passport_expiry_date: "",
            passport_image: "",
            /** Ảnh chân dung — bắt buộc E-Visa, optional loại khác */
            portrait_image: "",
            flight_ticket: "",
        });

        if (hasUrlParams) {
            const mapped = mapQuickApplyParams(params);
            
            // Nếu người dùng chọn một category hoàn toàn khác so với bản nháp, xoá nháp
            if (draft?.step1) {
                let isMismatch = false;
                const draftType = draft.step1.visa_type;
                const isCodeFastTrack = draft.step1.visa_category === "code_fasttrack";
                const newCat = params.get("category");
                
                if (newCat === "evisa" && (draftType !== "evisa" || isCodeFastTrack)) isMismatch = true;
                if (newCat === "voa" && draftType !== "voa") isMismatch = true;
                if (newCat === "evisa-code" && !isCodeFastTrack) isMismatch = true;
                
                if (isMismatch) {
                    clearApplyDraft();
                    draft = null;
                }
            }

            if (Object.keys(mapped).length > 0) {
                step1 = {
                    visa_type: mapped.visa_type ?? "evisa",
                    visa_category: mapped.visa_category ?? "evisa_30d_single",
                    processing_time: mapped.processing_time ?? "normal_7d",
                    applicant_count: mapped.applicant_count ?? 1,
                    arrival_date: mapped.arrival_date ?? "",
                    port_of_entry: mapped.port_of_entry ?? "",
                    purpose_of_visit: mapped.purpose_of_visit ?? "",
                    vip_fast_track: params.get("vip") === "true" || (mapped.vip_fast_track ?? false),
                    basic_fast_track: params.get("option") === "basic-fasttrack" || (mapped.basic_fast_track ?? false),
                };

                if (params.get("step") === "2" && mapped.visa_category === "code_fasttrack") {
                    step = 2;
                }
            }

            if (draft?.step2) {
                step2 = draft.step2;
                if (step1) {
                    const targetLength = step1.applicant_count;
                    if (!step2.applicants) {
                        step2.applicants = Array.from({ length: targetLength }, () => createEmptyApp());
                    } else if (step2.applicants.length > targetLength) {
                        step2.applicants = step2.applicants.slice(0, targetLength);
                    } else if (step2.applicants.length < targetLength) {
                        const diff = targetLength - step2.applicants.length;
                        for (let i = 0; i < diff; i++) {
                            step2.applicants.push(createEmptyApp());
                        }
                    }
                }
            } else if (step1) {
                step2 = {
                    email: "",
                    phone: "",
                    applicants: Array.from({ length: step1.applicant_count }, () => createEmptyApp()),
                };
            }
        } else {
            if (draft?.step1) step1 = draft.step1;
            if (draft?.step2) step2 = draft.step2;
            if (draft?.currentStep && draft.currentStep >= 1 && draft.currentStep <= 3) {
                step = draft.currentStep > 1 && !draft.step1 ? 1 : draft.currentStep;
            }
        }

        if (step1) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStep1Data(step1);
            setStep1Live(step1);
        }
        if (step2) {
            setStep2Data(step2);
        }
        setCurrentStep(step);
        const restoredMax = Math.max(step, draft?.maxStepReached ?? 1);
        setMaxStepReached(restoredMax);
        setHydrated(true);

        if (typeof window !== "undefined") {
            window.sessionStorage.setItem("has_visited_apply", "true");
        }

        saveApplyDraft({
            step1: step1 ?? undefined,
            step2: step2 ?? undefined,
            currentStep: step,
            maxStepReached: restoredMax,
        });

        return () => {
            clearInterval(intervalId);
        };
    }, [initHash]);

    const handleStep1LiveChange = useCallback(
        (data: Step1FormValues) => {
            setStep1Live(data);
            refreshApiPrice(data);
        },
        [refreshApiPrice],
    );

    const persistDraft = useCallback(
        (patch: { step1?: Step1FormValues | null; step2?: Step2FormValues | null; currentStep?: number }) => {
            saveApplyDraft({
                step1: patch.step1 ?? step1Data ?? undefined,
                step2: patch.step2 ?? step2Data ?? undefined,
                currentStep: patch.currentStep ?? currentStep,
                maxStepReached,
            });
        },
        [step1Data, step2Data, currentStep, maxStepReached],
    );

    const handleStep1Next = useCallback((data: Step1FormValues) => {
        setStep1Data(data);
        setStep1Live(data);
        setCurrentStep(2);
        setMaxStepReached((prev) => Math.max(prev, 2));
        persistDraft({ step1: data, currentStep: 2 });
        refreshApiPrice(data);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [persistDraft, refreshApiPrice]);

    const handleStep2Next = useCallback((data: Step2FormValues) => {
        setStep2Data(data);
        setCurrentStep(3);
        setMaxStepReached((prev) => Math.max(prev, 3));
        persistDraft({ step2: data, currentStep: 3 });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [persistDraft]);

    const handleStep2Draft = useCallback(
        (data: Step2FormValues) => {
            setStep2Data(data);
            if (step1Data) {
                saveApplyDraft({
                    step1: step1Data,
                    step2: data,
                    currentStep,
                    maxStepReached,
                });
            }
        },
        [step1Data, currentStep, maxStepReached],
    );

    const handleStepClick = useCallback((step: number, resetPaymentError?: () => void) => {
        if (step === currentStep) return;
        setCurrentStep(step);
        resetPaymentError?.();
        persistDraft({ currentStep: step });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentStep, persistDraft]);

    const handleStep1Change = useCallback((patch: Partial<Step1FormValues>) => {
        if (!step1Data) return;
        const newData = { ...step1Data, ...patch };
        setStep1Data(newData);
        handleStep1LiveChange(newData);
        persistDraft({ step1: newData });
    }, [step1Data, handleStep1LiveChange, persistDraft]);

    const navigateBackToStep1 = useCallback(() => {
        setCurrentStep(1);
        persistDraft({ currentStep: 1 });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [persistDraft]);

    const navigateBackToStep2 = useCallback(() => {
        setCurrentStep(2);
        persistDraft({ currentStep: 2 });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [persistDraft]);

    return {
        currentStep,
        step1Data,
        step1Live,
        step2Data,
        hydrated,
        maxStepReached,
        apiPrice,
        isPriceLoading,
        handleStep1LiveChange,
        handleStep1Next,
        handleStep2Next,
        handleStep2Draft,
        handleStepClick,
        handleStep1Change,
        navigateBackToStep1,
        navigateBackToStep2,
    };
}
