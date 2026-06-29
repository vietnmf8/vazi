"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Typography } from "@/components/ui/Typography";
import { cn } from "@/lib/utils";
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api";
import UploadIcon from "@/assets/icons/ui/Upload.svg";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export interface PassportUploadZoneProps {
    label: string;
    hint: string;
    value?: string;
    onChange: (secureUrl: string) => void;
    onClear?: () => void;
    error?: string;
    required?: boolean;
    fieldName: string;
}

function isUploadedUrl(value: string | undefined): boolean {
    return Boolean(
        value?.startsWith("http://") || value?.startsWith("https://"),
    );
}

/** Cloudinary URL ảnh — loại PDF để hiển thị preview thật */
function isImageUploadUrl(value: string): boolean {
    const lower = value.toLowerCase();
    if (lower.includes(".pdf")) return false;
    return (
        /\.(jpg|jpeg|png|webp)(\?|$)/i.test(lower) ||
        lower.includes("/image/upload/")
    );
}

function getUploadFileName(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const segment = pathname.split("/").pop();
        return segment ?? "Uploaded file";
    } catch {
        return "Uploaded file";
    }
}

/**
 * Vùng upload drag-drop — presigned URL → Cloudinary, lưu secure_url vào form.
 */
export function PassportUploadZone({
    label,
    hint,
    value,
    onChange,
    onClear,
    error,
    required = true,
    fieldName,
}: PassportUploadZoneProps) {
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const uploadFile = useCallback(
        async (file: File) => {
            setLocalError(null);
            setUploading(true);

            try {
                const presigned = await getPresignedUrl(file.name, file.type);
                const secureUrl = await uploadToCloudinary(file, presigned);
                onChange(secureUrl);
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Upload failed. Please try again.";
                setLocalError(message);
                onClear?.();
                if (inputRef.current) inputRef.current.value = "";
            } finally {
                setUploading(false);
            }
        },
        [onChange, onClear],
    );

    const handleFile = useCallback(
        (file: File | undefined) => {
            if (!file || uploading) return;
            setLocalError(null);

            if (!ACCEPTED_TYPES.includes(file.type)) {
                setLocalError("Only JPG, PNG, or PDF files are allowed");
                return;
            }
            if (file.size > MAX_BYTES) {
                setLocalError("File must be 5MB or smaller");
                return;
            }

            void uploadFile(file);
        },
        [uploadFile, uploading],
    );

    const displayError = error ?? localError ?? undefined;
    const hasFile = Boolean(value);
    const uploadedUrl = value ?? "";

    return (
        <div className="space-y-2" data-field={fieldName}>
            <label
                htmlFor={inputId}
                className="flex items-center gap-1.5 text-sm font-medium leading-none text-[var(--color-text-primary)]"
            >
                {label}
                {required && (
                    <span
                        className="text-xs text-[var(--color-error)]"
                        aria-hidden
                    >
                        *Required
                    </span>
                )}
            </label>

            <div
                role="button"
                tabIndex={uploading ? -1 : 0}
                aria-label={`${label}. ${hint}`}
                aria-describedby={displayError ? errorId : undefined}
                aria-busy={uploading}
                onKeyDown={(e) => {
                    if (uploading) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onClick={() => {
                    if (!uploading) inputRef.current?.click();
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!uploading) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFile(e.dataTransfer.files[0]);
                }}
                className={cn(
                    "rounded-xl border-2 border-dashed p-6 text-center transition-all",
                    uploading ? "cursor-wait opacity-70" : "",
                    isDragging
                        ? "border-[var(--color-text-primary)] bg-[var(--color-surface-elevated)]"
                        : "border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]/30 hover:border-[var(--color-text-tertiary)] transition-all",
                    displayError && "border-[var(--color-error)]",
                )}
            >
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />

                {uploading ? (
                    <div className="space-y-2">
                        <Typography variant="body" className="font-semibold">
                            Uploading…
                        </Typography>
                        <Typography
                            variant="caption"
                            className="text-[var(--color-text-tertiary)]"
                        >
                            Please wait
                        </Typography>
                    </div>
                ) : hasFile ? (
                    <div className="space-y-3">
                        {isUploadedUrl(uploadedUrl) &&
                        isImageUploadUrl(uploadedUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element -- preview URL Cloudinary động, không qua next/image domain config
                            <img
                                src={uploadedUrl}
                                alt={`${label} preview`}
                                className="mx-auto max-h-48 w-full rounded-lg object-contain"
                            />
                        ) : isUploadedUrl(uploadedUrl) ? (
                            <div className="flex flex-col items-center gap-2 py-2">
                                <Typography variant="body" className="font-semibold">
                                    PDF uploaded
                                </Typography>
                                <Typography
                                    variant="caption"
                                    className="max-w-full truncate text-[var(--color-text-tertiary)]"
                                >
                                    {getUploadFileName(uploadedUrl)}
                                </Typography>
                            </div>
                        ) : (
                            <Typography variant="body" className="font-semibold">
                                {uploadedUrl}
                            </Typography>
                        )}
                        <button
                            type="button"
                            className="text-sm text-[var(--color-text-tertiary)] underline hover:text-[var(--color-text-primary)] transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear?.();
                                if (inputRef.current)
                                    inputRef.current.value = "";
                            }}
                        >
                            Remove file
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-[var(--color-surface-base)] p-3">
                            <UploadIcon className="size-7 text-[var(--color-text-primary)]" aria-hidden="true" />
                        </div>
                        <Typography variant="body" className="font-semibold">
                            Click to upload or drag and drop
                        </Typography>
                        <Typography variant="caption">
                            JPG, PNG, PDF up to 5MB
                        </Typography>
                    </div>
                )}
            </div>

            <Typography
                variant="caption"
                className="text-[var(--color-text-tertiary)]"
            >
                {hint}
            </Typography>

            {displayError && (
                <p
                    id={errorId}
                    className="text-sm text-[var(--color-error)]"
                    role="alert"
                >
                    {displayError}
                </p>
            )}
        </div>
    );
}
