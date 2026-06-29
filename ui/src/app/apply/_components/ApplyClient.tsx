"use client";

import { useState } from "react";
import { m, useScroll, useMotionValueEvent } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApplicationStepper } from "./ApplicationStepper";
import { PriceBreakdown } from "./PriceBreakdown";
import { Step1VisaOptions } from "./Step1VisaOptions";
import { Step2ApplicantDetails } from "./Step2ApplicantDetails";
import { Step3ReviewPayment } from "./Step3ReviewPayment";
import { useApplyFlow } from "./hooks/useApplyFlow";
import { useApplyPayment } from "./hooks/useApplyPayment";
import { Typography } from "@/components/ui/Typography";
import type { Nationality, Port } from "@/types/api";
import { useTranslations } from "next-intl";

import { PricingConfigData } from "./priceCalculator";
import { useAgentStore } from "@/stores/agentStore";
import { useEffect } from "react";

interface ApplyClientProps {
    ports: Port[];
    nationalities: Nationality[];
    pricingConfig?: PricingConfigData | null;
}

/**
 * Apply Online — 3 bước nối API calculate-price, submit, PayPal Hosted Checkout.
 */
export function ApplyClient({ ports, nationalities, pricingConfig }: ApplyClientProps) {
    const router = useRouter();
    const { scrollY } = useScroll();
    const [showStepper, setShowStepper] = useState(true);
    const t = useTranslations("ApplyPage.ApplyClient");

    // Removed useApplyMasterData. Loading state is now handled by the parent server component.

    const {
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
    } = useApplyFlow();

    const {
        termsAccepted,
        setTermsAccepted,
        isPaymentSubmitting,
        paymentError,
        setPaymentError,
        handleProceedPayment,
    } = useApplyPayment(step1Data, step2Data);

    // Đảo ngược: scroll xuống → hiện stepper (user muốn biết tiến trình), scroll lên → ẩn (tránh che nội dung)
    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        if (latest > previous && latest > 100) {
            setShowStepper(true);
        } else if (latest < previous) {
            setShowStepper(false);
        }
    });

    if (!hydrated) {
        return (
            <div className="container mx-auto px-4 py-12">
                <Typography
                    variant="body"
                    className="text-(--color-text-muted) body-text-sm"
                >
                    {t("loading")}
                </Typography>
            </div>
        );
    }

    const priceSource = step1Live ?? step1Data;
    const isStandaloneFastTrack = priceSource?.visa_category === "code_fasttrack";

    // Nút Proceed to Payment — dùng lại ở cả sidebar desktop và mobile bar
    const proceedButton = (
        <Button
            type="button"
            size="lg"
            className="w-full h-14 text-base font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-3 transition-all"
            disabled={!termsAccepted || isPaymentSubmitting}
            onClick={() => void handleProceedPayment()}
            aria-disabled={!termsAccepted || isPaymentSubmitting}
            data-ai-element="pay_with"
        >
            {isPaymentSubmitting ? (
                <Spinner className="h-6 w-6" />
            ) : (
                <>
                    {t("pay_with")}
                    <Image
                        src="/PayPal.png"
                        alt="PayPal"
                        width={100}
                        height={21}
                        className="object-contain"
                        // style={{ height: "auto", width: "auto" }}
                        priority
                    />
                </>
            )}
        </Button>
    );

    return (
        <>
            {/* Sticky Application Stepper */}
            <m.div
                className="hidden lg:flex sticky top-[calc(var(--header-total-height)+30px)] z-40 justify-center px-4 pointer-events-none "
                initial={false}
                animate={{
                    y: showStepper ? 0 : -100,
                    scale: showStepper ? 1 : 0.95,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div className="pointer-events-auto w-full max-w-2xl flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/40 dark:bg-black/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-2xl">
                    <ApplicationStepper
                        currentStep={currentStep}
                        maxStepReached={maxStepReached}
                        onStepClick={(step) => handleStepClick(step, () => setPaymentError(null))}
                        isFastTrack={isStandaloneFastTrack}
                    />
                </div>
            </m.div>

            <div className="container mx-auto px-4 py-8 pb-32 lg:pb-8" data-ai-target="apply_form">
                <div className="mt-8 flex flex-col gap-8 lg:flex-row">
                    <div className="min-w-0 flex-1">
                        {currentStep === 1 && (
                            <Step1VisaOptions
                                defaultValues={step1Data ?? undefined}
                                ports={ports}
                                portsLoading={false}
                                onChange={handleStep1LiveChange}
                                onNext={handleStep1Next}
                                pricingConfig={pricingConfig}
                            />
                        )}

                        {currentStep === 2 && step1Data && (
                            <Step2ApplicantDetails
                                key={`step2-${step1Data.applicant_count}`}
                                step1={step1Data}
                                defaultValues={step2Data ?? undefined}
                                nationalities={nationalities}
                                onBack={navigateBackToStep1}
                                onNext={handleStep2Next}
                                onDraftChange={handleStep2Draft}
                                onStep1Change={handleStep1Change}
                            />
                        )}

                        {currentStep === 3 && step1Data && step2Data && (
                            <Step3ReviewPayment
                                step1={step1Data}
                                step2={step2Data}
                                apiPrice={apiPrice}
                                ports={ports}
                                termsAccepted={termsAccepted}
                                onTermsChange={setTermsAccepted}
                                submitError={paymentError}
                                onBack={navigateBackToStep2}
                                pricingConfig={pricingConfig}
                            />
                        )}

                        {currentStep === 2 && !step1Data && (
                            <Typography
                                variant="body"
                                className="text-(--color-text-muted) body-text-sm"
                            >
                                {t("complete_options")}
                            </Typography>
                        )}
                    </div>

                    {/* Sidebar desktop */}
                    <aside className="hidden w-full shrink-0 lg:block lg:w-[420px]">
                        <div
                            className="fixed w-[420px] space-y-6"
                            style={{
                                top: `calc(var(--header-total-height) + 160px)`,
                            }}
                        >
                            <PriceBreakdown
                                step1={priceSource}
                                apiPrice={apiPrice}
                                isPriceLoading={isPriceLoading}
                                variant="sidebar"
                                pricingConfig={pricingConfig}
                            >
                                {(currentStep === 1 || currentStep === 2) && (
                                    <Button
                                        type="submit"
                                        form={`step${currentStep}-form`}
                                        size="lg"
                                        className="w-full h-14 text-base font-bold shadow-md hover:shadow-lg transition-all"
                                        data-ai-element={currentStep === 1 ? "next_step2" : "next_step3"}
                                    >
                                        {currentStep === 1
                                            ? t("next_step2")
                                            : t("next_step3")}
                                    </Button>
                                )}
                                {currentStep === 3 && proceedButton}
                            </PriceBreakdown>
                        </div>
                    </aside>
                </div>

                {/* Mobile bottom bar */}
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-default)] bg-[var(--color-surface-base)] lg:hidden">
                    <PriceBreakdown
                        step1={priceSource}
                        apiPrice={apiPrice}
                        isPriceLoading={isPriceLoading}
                        variant="mobile"
                        pricingConfig={pricingConfig}
                        mobileStepper={
                            <div className="w-full relative scale-90 origin-left -my-2 py-0">
                                <ApplicationStepper
                                    currentStep={currentStep}
                                    maxStepReached={maxStepReached}
                                    onStepClick={(step) => handleStepClick(step, () => setPaymentError(null))}
                                    hideLabels={true}
                                    isFastTrack={isStandaloneFastTrack}
                                />
                            </div>
                        }
                    />
                    {(currentStep === 1 || currentStep === 2) && (
                        <div className="p-4 border-t border-[var(--color-border-default)]">
                            <Button
                                type="submit"
                                form={`step${currentStep}-form`}
                                size="lg"
                                className="w-full h-12 text-base font-bold shadow-md"
                                data-ai-element={currentStep === 1 ? "next_step2" : "next_step3"}
                            >
                                {currentStep === 1
                                    ? t("next_step2")
                                    : t("next_step3")}
                            </Button>
                        </div>
                    )}
                    {currentStep === 3 && (
                        <div className="p-4 border-t border-[var(--color-border-default)]">
                            {proceedButton}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
