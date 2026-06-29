"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Typography } from "@/components/ui/Typography";
import { loadApplyDraft } from "../_components/applyDraftStorage";
import type { ApplyDraft } from "../_components/applySchemas";
import { VISA_CATEGORY_LABELS } from "../_components/priceCalculator";

/**
 * Magic link resume — ?resume=true kèm draft sessionStorage để tiếp tục đơn.
 */
function ApplyResumeContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const applicationId =
        typeof params.id === "string" ? params.id : String(params.id ?? "");
    const isResume = searchParams.get("resume") === "true";

    const [hydrated, setHydrated] = useState(false);
    // Lazy init từ sessionStorage — chỉ chạy trên client; hydrated guard ẩn content đến khi useEffect set hydrated=true
    const [draft] = useState<ApplyDraft | null>(() =>
        typeof window !== "undefined" ? loadApplyDraft() : null,
    );

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHydrated(true);
    }, []);

    if (!hydrated) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-16">
                <Typography variant="body">Loading…</Typography>
            </div>
        );
    }

    if (!isResume) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-16">
                <Card>
                    <CardHeader>
                        <CardTitle>Application link</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Typography variant="body" className="body-text-sm">
                            To continue a saved application, open the resume link from
                            your email with <code>?resume=true</code>.
                        </Typography>
                        <Button asChild>
                            <Link href="/apply">Start or continue at Apply</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const hasDraft = Boolean(draft?.step1 || draft?.step2);
    const step1 = draft?.step1;
    const step2 = draft?.step2;

    if (!hasDraft) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-16">
                <Card>
                    <CardHeader>
                        <CardTitle>Draft not found</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Typography variant="body" className="body-text-sm">
                            We could not find a saved application on this device for
                            booking <strong>{applicationId || "—"}</strong>. Start a new
                            application or check status if you already paid.
                        </Typography>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild>
                                <Link href="/apply">Start new application</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/check-status">Check status</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const visaLabel = step1
        ? VISA_CATEGORY_LABELS[step1.visa_category]
        : "—";
    const applicantCount = step1?.applicant_count ?? step2?.applicants.length ?? "—";
    const contactEmail = step2?.email ?? "—";
    const currentStep = draft?.currentStep ?? 1;

    return (
        <div className="container mx-auto max-w-2xl px-4 py-16">
            <div className="space-y-2 text-center">
                <Typography variant="h2">Continue your application</Typography>
                <Typography variant="body" className="body-text-sm">
                    Your saved progress is ready on this device.
                </Typography>
            </div>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>
                        Booking {applicationId ? `#${applicationId}` : "draft"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="caption-text">Visa</dt>
                            <dd className="font-medium">{visaLabel}</dd>
                        </div>
                        <div>
                            <dt className="caption-text">Applicants</dt>
                            <dd className="font-medium">{applicantCount}</dd>
                        </div>
                        <div>
                            <dt className="caption-text">Contact email</dt>
                            <dd className="font-medium">{contactEmail}</dd>
                        </div>
                        <div>
                            <dt className="caption-text">Last step</dt>
                            <dd className="font-medium">Step {currentStep} of 3</dd>
                        </div>
                        {step1?.arrival_date ? (
                            <div className="sm:col-span-2">
                                <dt className="caption-text">Arrival</dt>
                                <dd className="font-medium">{step1.arrival_date}</dd>
                            </div>
                        ) : null}
                    </dl>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button asChild>
                            <Link href="/apply">Resume application</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/">Return home</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ApplyResumePage() {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto px-4 py-16">
                    <Typography variant="body">Loading…</Typography>
                </div>
            }
        >
            <ApplyResumeContent />
        </Suspense>
    );
}
