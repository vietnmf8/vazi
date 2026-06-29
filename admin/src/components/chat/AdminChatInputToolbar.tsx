"use client"

import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { EmojiClickData, Theme } from "emoji-picker-react"
import { ImagePlus, Paperclip, Smile } from "lucide-react"
import toast from "react-hot-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { compressImage } from "@/lib/image"
import { t } from "@/lib/i18n"

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })

const MAX_FILE_SIZE_MB = 10

interface AdminChatInputToolbarProps {
 isUploading: boolean
 setIsUploading: (val: boolean) => void
 onEmojiSelect: (emoji: string) => void
 pendingImagesCount: number
 onImagesAdded: (base64s: string[]) => void
 pendingFilesCount: number
 onFilesAdded: (files: File[]) => void
 disabled?: boolean
}

/**
 * Thanh công cụ đính kèm tin nhắn admin — emoji, ảnh, tài liệu.
 */
export function AdminChatInputToolbar({
 isUploading,
 setIsUploading,
 onEmojiSelect,
 pendingImagesCount,
 onImagesAdded,
 pendingFilesCount,
 onFilesAdded,
 disabled = false,
}: AdminChatInputToolbarProps) {
 const fileInputRef = useRef<HTMLInputElement>(null)
 const imageInputRef = useRef<HTMLInputElement>(null)
 const [showEmojiPicker, setShowEmojiPicker] = useState(false)

 const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = Array.from(e.target.files ?? [])
 if (files.length === 0) return

 if (pendingImagesCount + files.length > 5) {
 toast.error(t("chat.inputMaxImages"))
 return
 }

 setIsUploading(true)
 try {
 const newBase64s: string[] = []
 for (const file of files) {
 if (file.size > 15 * 1024 * 1024) {
 toast.error(t("chat.inputFileSizeExceeded"))
 continue
 }
 const compressed = await compressImage(file)
 newBase64s.push(compressed)
 }
 onImagesAdded(newBase64s)
 } catch {
 toast.error(t("chat.inputFileSizeExceeded"))
 } finally {
 setIsUploading(false)
 if (imageInputRef.current) imageInputRef.current.value = ""
 }
 }

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = Array.from(e.target.files ?? [])
 if (files.length === 0) return

 if (pendingFilesCount + files.length > 3) {
 toast.error(t("chat.inputMaxFiles"))
 if (fileInputRef.current) fileInputRef.current.value = ""
 return
 }

 const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE_MB * 1024 * 1024)
 if (validFiles.length !== files.length) {
 toast.error(t("chat.inputFileSizeExceeded"))
 if (validFiles.length === 0) {
 if (fileInputRef.current) fileInputRef.current.value = ""
 return
 }
 }

 onFilesAdded(validFiles)
 if (fileInputRef.current) fileInputRef.current.value = ""
 }

 const handleEmojiClick = (data: EmojiClickData) => {
 onEmojiSelect(data.emoji)
 setShowEmojiPicker(false)
 }

 const btnClass =
 "flex size-7 items-center justify-center rounded-md transition-all disabled:opacity-50 hover:opacity-80"

 return (
 <div className="flex items-center gap-1">
 <input
 ref={fileInputRef}
 type="file"
 accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md"
 multiple
 className="sr-only"
 onChange={handleFileChange}
 aria-label="Attach document"
 disabled={disabled}
 />
 <input
 ref={imageInputRef}
 type="file"
 accept="image/*"
 multiple
 className="sr-only"
 onChange={(e) => void handleImageChange(e)}
 aria-label="Attach image"
 disabled={disabled}
 />

 <button
 type="button"
 onClick={() => imageInputRef.current?.click()}
 disabled={isUploading || disabled}
 className={btnClass}
 style={{ color: "var(--color-text-muted)" }}
 aria-label="Attach image"
 >
 <ImagePlus className="size-4" />
 </button>

 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading || disabled}
 className={btnClass}
 style={{ color: "var(--color-text-muted)" }}
 aria-label="Attach document"
 >
 <Paperclip className="size-4" />
 </button>

 <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
 <PopoverTrigger asChild>
 <button
 type="button"
 disabled={disabled}
 className={btnClass}
 style={{ color: "var(--color-text-muted)" }}
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
 )
}
