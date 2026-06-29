"use client";

import * as React from "react";
import { useCallback, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileImage, Trash2 } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { get, set, del } from "idb-keyval";
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api";
import ErrorCircleIcon from "@/assets/icons/ui/ErrorCircle.svg";

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return createPortal(
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[200] backdrop-blur-md bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-50 border-0"
                aria-label="Close image"
            >
                <X className="size-5" />
            </button>
            <m.img
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                src={src}
                alt="Full preview"
                className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </m.div>,
        document.body,
    );
}

export interface ImageUploadZoneProps {
    value?: string | null;
    onChange: (value: string | null, file?: File, isBackgroundSuccess?: boolean) => void;
    label?: string;
    error?: string;
    className?: string;
    description?: string;
    mainText?: string;
    dropText?: string;
    maxSizeMB?: number;
}

export function ImageUploadZone({
    value,
    onChange,
    label,
    error,
    className,
    description,
    mainText,
    dropText,
    maxSizeMB = 5,
}: ImageUploadZoneProps) {
    const t = useTranslations("ImageUploadZone");

    const resolvedDescription = description ?? t("description", { maxSizeMB });
    const resolvedMainText    = mainText    ?? t("main_text");
    const resolvedDropText    = dropText    ?? t("drop_text");
    // Lazy init: nếu value ban đầu là cloudinary URL thì set preview ngay, tránh flash placeholder khi remount
    const [preview, setPreview] = useState<string | null>(() => {
        if (!value || value.startsWith("local-draft:")) return null;
        return value;
    });
    const [isHovered, setIsHovered] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    // Track the currently active IDB draft UUID.
    // This prevents background uploads from updating the form if the user has already dropped a new image.
    const currentUuidRef = useRef<string | null>(null);
    
    // Remember the remote URL of the successfully uploaded blob to prevent replacing the blob preview with the network URL.
    const uploadedUrlRef = useRef<string | null>(null);

    // Store current blob url to clean it up when unmounting or changing
    const objectUrlRef = useRef<string | null>(null);

    // Track previous value để dọn IDB khi value chuyển khỏi local-draft (thay vì xóa trong handleBackgroundUpload)
    const prevValueRef = useRef<string | null | undefined>(undefined);

    const cleanupObjectUrl = useCallback(() => {
        if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    // Dọn IDB khi value chuyển khỏi local-draft (upload xong hoặc user xóa ảnh).
    // Không xóa trong handleBackgroundUpload vì upload có thể hoàn thành khi component đã unmount,
    // khiến IDB bị xóa trước khi component kịp remount và đọc lại.
    useEffect(() => {
        const prev = prevValueRef.current;
        prevValueRef.current = value;

        if (prev?.startsWith("local-draft:") && prev !== value) {
            const uuid = prev.replace("local-draft:", "");
            del(uuid).catch(console.error);
        }
    }, [value]);

    // Background upload process
    const handleBackgroundUpload = useCallback(async (uuid: string, file: File) => {
        try {
            const presigned = await getPresignedUrl(file.name, file.type);
            const cloudinaryUrl = await uploadToCloudinary(file, presigned);

            if (currentUuidRef.current === uuid) {
                uploadedUrlRef.current = cloudinaryUrl;
                onChange(cloudinaryUrl, file, true);
            }
            // IDB cleanup được xử lý bởi transition effect bên trên khi value prop thay đổi
        } catch (err) {
            console.error(`[IUZ:${label}] UPLOAD FAILED`, err);
        }
    }, [onChange, label]);

    // Handle prop changes (Mount & Updates)
    useEffect(() => {
        if (!value) {
            cleanupObjectUrl();
            setTimeout(() => setPreview(null), 0);
            currentUuidRef.current = null;
            return;
        }

        // If it's a regular url (cloudinary) or an already set blob, just show it
        if (!value.startsWith("local-draft:")) {
            if (value !== preview) {
                // Prevent flicker: if we already have a local blob preview, and the form value just became
                // the remote Cloudinary URL for this same image (because background upload succeeded),
                // do NOT replace the local blob. Keep showing the local blob so it doesn't refetch from network.
                if (uploadedUrlRef.current === value && preview && preview.startsWith("blob:")) {
                    return;
                }
                setTimeout(() => setPreview(value), 0);
            }
            return;
        }

        // It's a local draft, we need to load it from IDB
        const uuid = value.replace("local-draft:", "");
        currentUuidRef.current = uuid;

        // Prevent infinite loops if we already loaded it
        if (preview && preview.startsWith("blob:")) {
            return;
        }

        let isMounted = true;

        get<File>(uuid).then((file) => {
            if (!isMounted || !file) return;

            cleanupObjectUrl();
            const objectUrl = URL.createObjectURL(file);
            objectUrlRef.current = objectUrl;
            setPreview(objectUrl);

            // Kick off background upload since it hasn't been uploaded yet
            handleBackgroundUpload(uuid, file);
        }).catch(console.error);

        return () => {
            isMounted = false;
        };
    }, [value, cleanupObjectUrl, handleBackgroundUpload, preview]);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (file) {
                cleanupObjectUrl();

                // Cleanup previous IDB draft if it exists and hasn't finished uploading
                if (value?.startsWith("local-draft:")) {
                    const oldUuid = value.replace("local-draft:", "");
                    del(oldUuid).catch(console.error);
                }

                // 1. Generate UUID and store File to IndexedDB
                const uuid = crypto.randomUUID();
                currentUuidRef.current = uuid;
                uploadedUrlRef.current = null;
                await set(uuid, file);

                // 2. Create local preview immediately
                const objectUrl = URL.createObjectURL(file);
                objectUrlRef.current = objectUrl;
                setPreview(objectUrl);

                // 3. Emit local-draft value to Form state along with File for instant OCR
                onChange(`local-draft:${uuid}`, file);

                // 4. Trigger background upload
                handleBackgroundUpload(uuid, file);
            }
        },
        [onChange, cleanupObjectUrl, handleBackgroundUpload, value],
    );

    const rootProps = useDropzone({
        onDrop,
        accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
        },
        maxSize: maxSizeMB * 1024 * 1024,
        maxFiles: 1,
        multiple: false,
        noClick: !!preview,
    });

    const { getRootProps, getInputProps, isDragActive, isDragReject } = rootProps;

    const dropzoneRootProps = getRootProps();
    const { onClick: dropzoneClick, ...restDropzoneProps } = dropzoneRootProps;

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (preview) {
            setIsZoomed(true);
        } else {
            dropzoneClick?.(e);
        }
    };

    const handleRemove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        cleanupObjectUrl();
        setPreview(null);
        uploadedUrlRef.current = null;
        currentUuidRef.current = null;
        
        // Clean up from IDB if it was a draft
        if (value?.startsWith("local-draft:")) {
            const uuid = value.replace("local-draft:", "");
            await del(uuid);
        }
        
        onChange(null);
    };

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && (
                <label className="text-sm font-semibold text-(--color-text-primary)">
                    {label}
                </label>
            )}

            <div
                {...restDropzoneProps}
                onClick={handleContainerClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "relative overflow-hidden rounded-[var(--radius-lg)] border-2 border-dashed p-6 transition-all duration-200 ",
                    "flex flex-col items-center justify-center text-center outline-none",
                    preview
                        ? "border-(--color-border) bg-(--color-surface-1)"
                        : isDragActive
                            ? "border-(--color-primary) bg-(--color-primary-subtle)"
                            : isDragReject || error
                                ? "border-(--color-error) bg-(--color-error)/5"
                                : "border-(--color-border-strong) bg-(--color-surface-2) hover:border-(--color-primary)/50 hover:bg-(--color-surface-3) transition-all",
                )}
                style={{ minHeight: "350px" }}
            >
                <input {...getInputProps()} />

                <AnimatePresence mode="wait">
                    {preview ? (
                        <m.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 size-full"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={preview}
                                alt="Upload preview"
                                className="size-full object-contain p-2"
                            />

                            <AnimatePresence>
                                {isHovered && (
                                    <m.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 pointer-events-none"
                                    >
                                        {/* Gradient tối dần về phía đáy để nút xóa nổi rõ */}
                                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent rounded-b-[var(--radius-lg)]" />
                                        {/* Nút xóa icon thùng rác, slide-up từ đáy */}
                                        <m.button
                                            type="button"
                                            onClick={handleRemove}
                                            initial={{ y: 14, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: 8, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 380, damping: 26 }}
                                            className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center size-9 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/35 hover:text-red-300 transition-all backdrop-blur-sm"
                                            aria-label="Remove image"
                                        >
                                            <Trash2 className="size-4" />
                                        </m.button>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </m.div>
                    ) : (
                        <m.div
                            key="placeholder"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <div
                                className={cn(
                                    "flex size-12 items-center justify-center rounded-full transition-all",
                                    isDragActive
                                        ? "bg-(--color-primary) text-white dark:text-black"
                                        : isDragReject || error
                                            ? "bg-(--color-error)/10 text-(--color-error)"
                                            : "bg-(--color-surface-3) text-(--color-text-muted) group-hover:bg-(--color-surface-elevated) transition-all",
                                )}
                            >
                                {isDragReject || error ? (
                                    <FileImage className="size-6" />
                                ) : (
                                    <UploadCloud className="size-6" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-(--color-text-primary)">
                                    {isDragActive
                                        ? resolvedDropText
                                        : resolvedMainText}
                                </p>
                                <p className="text-xs text-(--color-text-muted) mt-1">
                                    {resolvedDescription}
                                </p>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {isZoomed && preview && (
                    <ImageLightbox src={preview} onClose={() => setIsZoomed(false)} />
                )}
            </AnimatePresence>

            {error && (
                <p
                    className="flex items-center gap-1.5 text-sm text-[var(--color-error)]"
                    role="alert"
                >
                    <ErrorCircleIcon className="size-4 shrink-0" aria-hidden="true" />
                    {error}
                </p>
            )}
        </div>
    );
}
