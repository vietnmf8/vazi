import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: React.ReactNode
  ref?: React.Ref<HTMLInputElement>
}

function Input({ className, type, error, icon, ref, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}
      <input
        type={type}
        autoComplete={props.autoComplete || "new-password"}
        className={cn(
          "flex h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50",
          icon && "pl-10",
          error && "border-[var(--color-error)] focus-visible:ring-[var(--color-error)]",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
    </div>
  )
}

export { Input }
