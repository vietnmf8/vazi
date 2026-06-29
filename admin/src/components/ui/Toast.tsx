"use client"

import toast, { Toaster as HotToaster } from "react-hot-toast"

type ToastType = "success" | "error"

export function showToast(message: string, type: ToastType = "success") {
 if (type === "success") {
 toast.success(message)
 } else {
 toast.error(message)
 }
}

export function ToastProvider() {
 return <HotToaster position="bottom-left" />
}
