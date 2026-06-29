"use client"

import { m } from "framer-motion"
import ValidationSuccessIcon from "@/assets/icons/ui/ValidationSuccess.svg"
import ValidationErrorIcon from "@/assets/icons/ui/ValidationError.svg"

interface ValidationBadgeProps {
  status: "success" | "error"
  message: string
}

export function ValidationBadge({ status, message }: ValidationBadgeProps) {
  const isSuccess = status === "success"

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-center gap-1.5 text-sm font-medium ${
        isSuccess
          ? "text-[color:var(--color-success,#22c55e)]"
          : "text-[color:var(--color-error)]"
      }`}
      role={isSuccess ? undefined : "alert"}
    >
      {isSuccess ? (
        <ValidationSuccessIcon className="shrink-0 size-4" aria-hidden="true" />
      ) : (
        <ValidationErrorIcon className="shrink-0 size-4" aria-hidden="true" />
      )}
      <span>{message}</span>
    </m.div>
  )
}
