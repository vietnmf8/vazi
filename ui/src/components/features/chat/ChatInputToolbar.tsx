"use client";

import * as React from "react";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { EmojiClickData, Theme } from "emoji-picker-react";
import { ImagePlus, Paperclip, Smile } from "lucide-react";
import toast from "react-hot-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { compressImage } from "@/lib/image";

// Tải động EmojiPicker ở phía client-side để tối ưu tốc độ tải trang ban đầu (SSR-friendly)
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const MAX_FILE_SIZE_MB = 10;

interface ChatInputToolbarProps {
    isUploading: boolean;
    setIsUploading: (val: boolean) => void;
    onEmojiSelect: (emoji: string) => void;
    pendingImagesCount: number;
    onImagesAdded: (base64s: string[]) => void;
    pendingFilesCount: number;
    onFilesAdded: (files: File[]) => void;
}

/**
 * Thanh công cụ tương tác đính kèm tin nhắn (Emoji Picker, Attach File, Upload Image).
 * TẠI SAO: Tách toàn bộ logic đính kèm tệp và chọn emoji phức tạp ra một component riêng giúp ChatInput.tsx giữ được sự tinh giản, dễ đọc và dễ mở rộng.
 */
export function ChatInputToolbar({
    isUploading,
    setIsUploading,
    onEmojiSelect,
    pendingImagesCount,
    onImagesAdded,
    pendingFilesCount,
    onFilesAdded,
}: ChatInputToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Xử lý nén và thêm ảnh tải lên
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        if (pendingImagesCount + files.length > 5) {
            toast.error("Tối đa 5 ảnh cho mỗi tin nhắn");
            return;
        }

        setIsUploading(true);
        try {
            const newBase64s: string[] = [];
            for (const file of files) {
                if (file.size > 15 * 1024 * 1024) {
                    toast.error(`Ảnh ${file.name} vượt quá dung lượng 15MB`);
                    continue;
                }
                const compressed = await compressImage(file);
                newBase64s.push(compressed);
            }
            onImagesAdded(newBase64s);
        } catch (error) {
            console.error("Lỗi khi xử lý nén ảnh chọn từ album:", error);
            toast.error("Không thể xử lý nén ảnh");
        } finally {
            setIsUploading(false);
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };

    // Xử lý tải lên tài liệu (PDF, v.v.)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        if (pendingFilesCount + files.length > 3) {
            toast.error("Tối đa 3 tài liệu cho mỗi lần gửi");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
        if (validFiles.length !== files.length) {
            toast.error(`Có file vượt quá dung lượng ${MAX_FILE_SIZE_MB}MB`);
            if (validFiles.length === 0) {
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
        }

        onFilesAdded(validFiles);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleEmojiClick = (data: EmojiClickData) => {
        onEmojiSelect(data.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="flex items-center gap-1">
            {/* Hidden inputs để kích hoạt upload file/ảnh */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                aria-label="Attach document file hidden input"
            />
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => void handleImageChange(e)}
                aria-label="Attach image hidden input"
            />

            {/* Nút bấm chọn ảnh */}
            <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                className="flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-2)] transition-all disabled:opacity-50 "
                aria-label="Attach image"
            >
                <ImagePlus className="size-4" />
            </button>

            {/* Nút bấm chọn tài liệu */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-2)] transition-all disabled:opacity-50 "
                aria-label="Attach document file"
            >
                <Paperclip className="size-4" />
            </button>

            {/* Picker chọn Emoji */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-2)] transition-all "
                        aria-label="Pick emoji"
                    >
                        <Smile className="size-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    side="top"
                    align="start"
                    className="w-auto p-0 border-0 shadow-xl overflow-hidden z-50"
                >
                    <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={"auto" as Theme}
                            height={320}
                            width={280}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
