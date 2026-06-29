"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { showToast } from "@/components/ui/Toast"
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api"
import { t } from "@/lib/i18n"

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const

type ImageUploadFieldProps = {
 labelKey: string
 value: string
 onChange: (url: string) => void
 /** Cho phép dán URL thủ công ngoài upload */
 allowManualUrl?: boolean
}

/**
 * Upload ảnh lên Cloudinary (presigned) hoặc nhập URL — dùng team/reviews/guidelines.
 */
export function ImageUploadField({
 labelKey,
 value,
 onChange,
 allowManualUrl = true,
}: ImageUploadFieldProps) {
 const inputRef = useRef<HTMLInputElement>(null)
 const [uploading, setUploading] = useState(false)

 async function handleFile(file: File) {
 if (!IMAGE_MIMES.includes(file.type as (typeof IMAGE_MIMES)[number])) {
 showToast(t("upload.invalidType"), "error")
 return
 }
 if (file.size > 5 * 1024 * 1024) {
 showToast(t("upload.tooLarge"), "error")
 return
 }

 setUploading(true)
 try {
 const presigned = await getPresignedUrl(file.name, file.type)
 const url = await uploadToCloudinary(file, presigned)
 onChange(url)
 showToast(t("upload.success"), "success")
 } catch {
 showToast(t("upload.failed"), "error")
 } finally {
 setUploading(false)
 if (inputRef.current) inputRef.current.value = ""
 }
 }

 return (
 <div className="space-y-2">
 <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
 {t(labelKey)}
 </span>

 {value ? (
 <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-border-default)" }}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={value} alt="" className="w-full h-32 object-cover" />
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="absolute top-2 right-2"
 onClick={() => onChange("")}
 >
 {t("upload.remove")}
 </Button>
 </div>
 ) : null}

 <input
 ref={inputRef}
 type="file"
 accept={IMAGE_MIMES.join(",")}
 className="sr-only"
 aria-label={t(labelKey)}
 onChange={(e) => {
 const file = e.target.files?.[0]
 if (file) void handleFile(file)
 }}
 />

 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={uploading}
 onClick={() => inputRef.current?.click()}
 >
 {uploading ? t("upload.uploading") : t("upload.chooseFile")}
 </Button>

 {allowManualUrl && (
 <Input
 placeholder={t("upload.urlPlaceholder")}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 />
 )}
 </div>
 )
}
