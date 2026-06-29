"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Typography } from "@/components/ui/Typography";
import { captureOrder } from "@/lib/api/payment.api";
import { getApplication } from "@/lib/api/application.api";
import {
    clearApplyDraft,
    clearPendingDraftId,
    loadPendingDraftId,
} from "../_components/applyDraftStorage";
import {
    formatUsd,
    formatVisaTypeLabel,
    formatVisaCategoryLabel,
} from "@/lib/enum-mappers";
import type { ApplicationDetail } from "@/types/api";
import { ApiClientError } from "@/lib/api-client";

type PageState = "loading" | "success" | "error";

/**
 * PayPal return URL — capture order rồi hiển thị booking summary.
 */
function ApplySuccessContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token")?.trim() ?? "";

    // Khởi tạo lazy: component nằm trong <Suspense> nên không render trên server,
    // token luôn available ngay lần render đầu tiên trên client
    const [state, setState] = useState<PageState>(() =>
        token ? "loading" : "error",
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(() =>
        token
            ? null
            : "Missing payment token. Please contact support if you were charged.",
    );
    const [application, setApplication] = useState<ApplicationDetail | null>(
        null,
    );
    const [bookingCode, setBookingCode] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        let cancelled = false;

        async function finalizePayment() {
            const pendingDraftId = loadPendingDraftId();

            try {
                const capture = await captureOrder(token, pendingDraftId);
                if (capture.application_code) {
                    setBookingCode(capture.application_code);
                }

                const applicationId = capture.application_id;
                if (applicationId) {
                    const detail = await getApplication(applicationId);
                    if (!cancelled) {
                        setApplication(detail);
                        if (detail.application_code) {
                            setBookingCode(detail.application_code);
                        }
                    }
                }

                clearApplyDraft();
                clearPendingDraftId();

                if (!cancelled) setState("success");
            } catch (err) {
                if (cancelled) return;
                setState("error");
                if (err instanceof ApiClientError) {
                    setErrorMessage(err.message);
                } else if (err instanceof Error) {
                    setErrorMessage(err.message);
                } else {
                    setErrorMessage(
                        "Payment confirmation failed. Please check your email or contact support.",
                    );
                }
            }
        }

        void finalizePayment();
        return () => {
            cancelled = true;
        };
    }, [token]);

    if (state === "loading") {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-16">
                <Typography variant="h3">Confirming your payment…</Typography>
                <Typography variant="body" className="mt-2 body-text-sm">
                    Please wait while we verify your PayPal transaction.
                </Typography>
            </div>
        );
    }

    if (state === "error") {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-16">
                <Card className="border-[var(--color-error)]/40">
                    <CardHeader>
                        <CardTitle>Payment confirmation issue</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p
                            className="text-sm text-(--color-error)"
                            role="alert"
                        >
                            {errorMessage}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild size="lg" variant="outline">
                                <Link href="/check-status">
                                    Check application status
                                </Link>
                            </Button>
                            <Button asChild size="lg">
                                <Link href="/apply">Back to apply</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const bookingId =
        bookingCode ??
        application?.application_code ??
        "—";

    return (
        <div className="container mx-auto max-w-2xl px-4 py-16">
            <div className="space-y-2 text-center">
                <Typography variant="h2">Thank you!</Typography>
                <Typography
                    variant="body"
                    className="body-text-sm"
                >
                    Your payment was received. We are processing your visa
                    application.
                </Typography>
            </div>

            <Card className="mt-8">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle>Booking #{bookingId}</CardTitle>
                        {application?.status && (
                            <Badge variant="success">
                                {application.status}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {application ? (
                        <dl className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <dt className="caption-text">
                                    Visa
                                </dt>
                                <dd className="font-medium">
                                    {formatVisaTypeLabel(application.visa_type)}{" "}
                                    —{" "}
                                    {formatVisaCategoryLabel(
                                        application.visa_category,
                                        application.extra_services
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="caption-text">
                                    Arrival
                                </dt>
                                <dd className="font-medium">
                                    {application.arrival_date}
                                </dd>
                            </div>
                            <div>
                                <dt className="caption-text">
                                    Applicants
                                </dt>
                                <dd className="font-medium">
                                    {application.applicant_count}
                                </dd>
                            </div>
                            <div>
                                <dt className="caption-text">
                                    Total paid
                                </dt>
                                <dd className="font-medium tabular-nums">
                                    {formatUsd(application.total_amount)}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="caption-text">
                                    Contact email
                                </dt>
                                <dd className="font-medium">
                                    {application.contact_email}
                                </dd>
                            </div>
                        </dl>
                    ) : (
                        <Typography
                            variant="body"
                            className="body-text-sm"
                        >
                            Payment confirmed. Save your booking number{" "}
                            <strong className="text-(--color-text-primary)">
                                {bookingId}
                            </strong>{" "}
                            for status checks.
                        </Typography>
                    )}

                    <div className="flex flex-wrap gap-3 pt-4">
                        <Button asChild size="lg">
                            <Link href="/check-status">Check status</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href="/">Return home</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ApplySuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto px-4 py-16">
                    <Typography variant="body">Loading…</Typography>
                </div>
            }
        >
            <ApplySuccessContent />
        </Suspense>
    );
}
