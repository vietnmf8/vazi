"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteNewsletter } from "@/lib/api/newsletter.api"
import { showToast } from "@/components/ui/Toast"
import { Button } from "@/components/ui/Button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/AlertDialog"
import { t } from "@/lib/i18n"

export function SubscriberActionCell({ id, email, isActive }: { id: string, email: string, isActive: boolean }) {
  const qc = useQueryClient()
  const unsubMutation = useMutation({
    mutationFn: deleteNewsletter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["newsletter"] })
      showToast("Đã xoá đăng ký thành công", "success")
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (timeLeft === null || timeLeft === -1) return
    if (timeLeft === 0) {
      unsubMutation.mutate(id)
      setTimeLeft(-1)
      return
    }
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, id, unsubMutation])

  if (timeLeft !== null) {
    if (timeLeft === -1) return null // Hide immediately to avoid flicker
    return (
      <div className="flex justify-center w-full">
        <Button variant="outline" size="sm" onClick={() => setTimeLeft(null)}>
          Hoàn tác ({timeLeft}s)
        </Button>
      </div>
    )
  }

  return isActive ? (
    <div className="flex justify-center w-full">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Xoá
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá đăng ký</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xoá đăng ký email {email}? Hành động này không thể hoàn tác sau 5 giây.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border border-red-600" onClick={() => setTimeLeft(5)}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ) : null
}
