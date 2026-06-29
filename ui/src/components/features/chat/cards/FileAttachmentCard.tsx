import React from "react";
import { FileText, FileSpreadsheet, FileIcon, Download, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface FileAttachmentCardProps {
    url: string;
    name?: string;
    onLoad?: () => void;
}

export function FileAttachmentCard({ url, name, onLoad }: FileAttachmentCardProps) {
    const t = useTranslations("ChatMessage");
    const checkStr = (name || url || "").toLowerCase();
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(checkStr);
    
    if (isImage) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt={name ?? "Attachment"}
                    className="max-h-48 rounded-lg object-cover"
                    onLoad={onLoad}
                />
            </a>
        );
    }

    const isExcel = checkStr.includes(".xls") || checkStr.includes(".xlsx") || checkStr.includes("spreadsheet");
    const isPdf = checkStr.includes(".pdf");
    const isWord = checkStr.includes(".doc") || checkStr.includes(".docx") || checkStr.includes("wordprocessing");

    let Icon = FileIcon;
    if (isExcel) Icon = FileSpreadsheet;
    else if (isPdf || isWord) Icon = FileText;

    // For non-image files, usually cloudinary `raw` upload does not view inline
    // We add a fl_attachment in the URL to force download if we want, but opening in new tab is fine.
    
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)] transition-colors w-full max-w-sm group"
        >
            <div className="flex items-center justify-center size-8 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)] shrink-0">
                <Icon className="size-4" aria-hidden />
            </div>
            <span className="truncate font-medium flex-1 text-[var(--color-text-primary)]">
                {name ?? t("download_file")}
            </span>
            <div className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0">
                <Download className="size-4" aria-hidden />
            </div>
        </a>
    );
}
