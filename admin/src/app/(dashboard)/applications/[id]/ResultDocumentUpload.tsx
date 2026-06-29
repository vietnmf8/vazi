"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Upload, FileText, Trash2, Loader2, Download } from "lucide-react"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import { getPresignedUrl, uploadToCloudinary } from "@/lib/upload"
import { updateApplicationResultDocument } from "@/lib/api/applications.api"
import type { AdminApplicationDetail } from "@/types/api"

export function ResultDocumentUpload({ application }: { application: AdminApplicationDetail }) {
  const [isUploading, setIsUploading] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (publicId: string | null) => updateApplicationResultDocument(application.id, publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["applications", application.id] })
      showToast("Đã lưu tệp đính kèm E-Visa", "success")
    },
    onError: () => {
      showToast(t("common.error"), "error")
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      showToast("Chỉ hỗ trợ file PDF", "error")
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
    if (confirm("Bạn có chắc chắn muốn xoá file PDF này không?")) {
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
        Tệp đính kèm E-Visa
      </h2>

      {application.resultDocumentPublicId ? (
        <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800/10 rounded-lg bg-gray-50 dark:bg-zinc-800/0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-red-100/10 text-red-600 rounded-lg shrink-0 dark:bg-red-900/10 dark:text-red-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="font-medium text-sm truncate">E-Visa.pdf</p>
              <p className="text-xs text-gray-500 mt-0.5">Đã tải lên hệ thống</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {application.result_document_download_url && (
              <a 
                href={application.result_document_download_url} 
                target="_blank" 
                rel="noreferrer"
                className="p-2 hover:bg-gray-200/10 dark:hover:bg-zinc-700/10 rounded-lg transition-colors text-blue-600 dark:text-blue-400"
                title="Tải xuống"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={handleRemove}
              disabled={mutation.isPending}
              className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
              title="Xoá file"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
            <p className="font-medium text-sm">Nhấn để tải lên file E-Visa</p>
            <p className="text-xs text-gray-500 mt-1">Hỗ trợ định dạng PDF</p>
          </div>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading || mutation.isPending}
          />
        </label>
      )}
    </section>
  )
}
