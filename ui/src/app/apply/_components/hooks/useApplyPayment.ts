import { useState } from "react";
import { submitApplication } from "@/lib/api/application.api";
import { createPaymentSession } from "@/lib/api/payment.api";
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api";
import { mapApplyFormToSubmitRequest } from "@/lib/enum-mappers";
import { ApiClientError } from "@/lib/api-client";
import { savePendingDraftId } from "../applyDraftStorage";
import type { Step1FormValues, Step2FormValues } from "../applySchemas";

export function useApplyPayment(step1Data: Step1FormValues | null, step2Data: Step2FormValues | null) {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    const handleProceedPayment = async () => {
        if (!step1Data || !step2Data) return;
        setPaymentError(null);
        setIsPaymentSubmitting(true);

        try {
            const finalStep2Data = JSON.parse(JSON.stringify(step2Data)) as Step2FormValues;

            for (const app of finalStep2Data.applicants) {
                if (app.passport_image?.startsWith("blob:")) {
                    const res = await fetch(app.passport_image);
                    const blob = await res.blob();
                    const file = new File([blob], "passport.jpg", { type: blob.type });
                    const sig = await getPresignedUrl(file.name, file.type);
                    app.passport_image = await uploadToCloudinary(file, sig);
                }
                if (app.flight_ticket?.startsWith("blob:")) {
                    const res = await fetch(app.flight_ticket);
                    const blob = await res.blob();
                    const file = new File([blob], "flight.jpg", { type: blob.type });
                    const sig = await getPresignedUrl(file.name, file.type);
                    app.flight_ticket = await uploadToCloudinary(file, sig);
                }
            }

            const payload = mapApplyFormToSubmitRequest(step1Data, finalStep2Data);

            let submitResult;
            try {
                submitResult = await submitApplication(payload);
            } catch (err) {
                if (err instanceof ApiClientError && err.code === "VALIDATION_ERROR" && err.details) {
                    const fieldMessages = Object.entries(err.details)
                        .flatMap(([, msgs]) => msgs)
                        .map((msg) => {
                            const messageMap: Record<string, string> = {
                                "validation.arrival_date.too_soon": "Arrival date must be at least 3 days from today.",
                                "validation.passport_expiry.invalid": "Passport must be valid for more than 6 months after your arrival date.",
                                "validation.applicants.count_mismatch": "Number of applicants does not match. Please go back and recheck.",
                                "validation.visa_category_mismatch": "Visa type and category do not match.",
                            };
                            return messageMap[msg] ?? msg;
                        });
                    setPaymentError(fieldMessages.join(" "));
                } else {
                    throw err;
                }
                return;
            }

            savePendingDraftId(submitResult.draft_id);

            const session = await createPaymentSession(submitResult.draft_id);

            if (!session.session_url) {
                setPaymentError("PayPal checkout URL was not returned.");
                return;
            }

            window.location.href = session.session_url;
        } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Payment could not be started. Please try again.");
        } finally {
            setIsPaymentSubmitting(false);
        }
    };

    return {
        termsAccepted,
        setTermsAccepted,
        isPaymentSubmitting,
        paymentError,
        setPaymentError,
        handleProceedPayment,
    };
}
