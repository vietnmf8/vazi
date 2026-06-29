"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, User } from "lucide-react"
import { showToast } from "@/components/ui/Toast"
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api"
import { t } from "@/lib/i18n"

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const

type AvatarUploadFieldProps = {
 value: string
 onChange: (url: string) => void
}

export function AvatarUploadField({ value, onChange }: AvatarUploadFieldProps) {
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
 <div className="flex flex-col items-center justify-center space-y-4 pt-4 pb-2">
 <div 
 className="relative size-24 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm group cursor-pointer"
 onClick={() => !uploading && inputRef.current?.click()}
 >
 {value ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={value} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
 <User className="size-10" />
 </div>
 )}

 <div className={`absolute inset-0 bg-black/40 flex items-center justify-center text-white transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
 {uploading ? (
 <Loader2 className="size-6 animate-spin" />
 ) : (
 <Camera className="size-6" />
 )}
 </div>
 </div>

 <input
 ref={inputRef}
 type="file"
 accept={IMAGE_MIMES.join(",")}
 className="sr-only"
 onChange={(e) => {
 const file = e.target.files?.[0]
 if (file) void handleFile(file)
 }}
 />
 </div>
 )
}
