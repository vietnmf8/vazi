"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Upload, ImageIcon, Trash2, Loader2, Download } from "lucide-react"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import { getPresignedUrl, uploadToCloudinary } from "@/lib/upload"
import { updateApplicationPickupImage } from "@/lib/api/applications.api"
import type { AdminApplicationDetail } from "@/types/api"

export function PickupImageUpload({ application }: { application: AdminApplicationDetail }) {
  const [isUploading, setIsUploading] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (publicId: string | null) => updateApplicationPickupImage(application.id, publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["applications", application.id] })
      showToast("Đã lưu ảnh điểm đón", "success")
    },
    onError: () => {
      showToast(t("common.error"), "error")
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      showToast("Chỉ hỗ trợ file hình ảnh", "error")
      return
    }

    try {
      setIsUploading(true)
      const presigned = await getPresignedUrl(file.name, file.type)
      await uploadToCloudinary(file, presigned)
      mutation.mutate(presigned.public_id)
    } catch (err) {
      console.error(err)
      showToast("Lỗi khi tải lên file", "error")
    } finally {
      setIsUploading(false)
    }
  }

  function handleRemove() {
    if (confirm("Bạn có chắc chắn muốn xoá ảnh điểm đón này không?")) {
      mutation.mutate(null)
    }
  }

  return (
    <section
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        border: "1px solid var(--color-border-default)",
      }}
    >
      <h2 className="font-medium mb-3" style={{ fontSize: "var(--font-size-lg)" }}>
        Ảnh điểm đón (Pick-up Point)
      </h2>

      {application.pickupPointImagePublicId ? (
        <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800/10 bg-gray-50 dark:bg-zinc-800/50">
            {application.pickup_point_image_download_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                    src={application.pickup_point_image_download_url} 
                    alt="Điểm đón"
                    className="w-full max-h-[400px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
            ) : (
                <div className="w-full h-48 flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-10 h-10 opacity-50" />
                </div>
            )}
            
            {/* Overlay actions on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                {application.pickup_point_image_download_url && (
                    <a 
                        href={application.pickup_point_image_download_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        title="Xem bản gốc"
                    >
                        <Download className="w-5 h-5" />
                    </a>
                )}
                <button
                    onClick={handleRemove}
                    disabled={mutation.isPending}
                    className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors disabled:opacity-50"
                    title="Xoá ảnh"
                >
                    {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
            </div>
        </div>
      ) : (
        <label className={`
          border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6
          flex flex-col items-center justify-center gap-3 cursor-pointer
          hover:bg-gray-50/10 dark:hover:bg-zinc-800/10 transition-colors
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}>
          <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">Nhấn để tải lên ảnh điểm đón</p>
            <p className="text-xs text-gray-500 mt-1">Hỗ trợ định dạng JPG, PNG</p>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading || mutation.isPending}
          />
        </label>
      )}
    </section>
  )
}
