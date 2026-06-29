"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteUser } from "@/lib/api/users.api"
import { showToast } from "@/components/ui/Toast"
import { Button } from "@/components/ui/Button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/AlertDialog"
import { t } from "@/lib/i18n"

export function UserActionCell({ id, email }: { id: string, email: string }) {
  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      showToast(t("common.deleted") || "Đã xoá tài khoản", "success")
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error?.message || t("common.error"), "error")
    },
  })

  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (timeLeft === null || timeLeft === -1) return
    if (timeLeft === 0) {
      deleteMutation.mutate(id)
      setTimeLeft(-1)
      return
    }
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, id, deleteMutation])

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

  return (
    <div className="flex justify-center w-full">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Xoá
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá tài khoản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang thao tác với quyền Super Admin. Bạn có chắc chắn muốn xoá tài khoản {email}? Hành động này không thể hoàn tác sau 5 giây.
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
  )
}
